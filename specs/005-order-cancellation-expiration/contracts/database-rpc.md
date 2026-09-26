# Database RPC & Trigger Contracts: Order Cancellation & Expiration

**Feature**: `005-order-cancellation-expiration`  
**Date**: 2026-09-25  
**Status**: Completed  
**Spec Reference**: [spec.md](../spec.md) | **Data Model**: [data-model.md](../data-model.md)

---

## 1. Stored Procedures (RPCs)

### 1.1 `public.cancel_order`

Customer-initiated self-service cancellation.

```sql
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  -- 1. Authentication check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify order ownership
  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.customer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You can only cancel your own orders.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Terminal state guard
  IF v_order.status IN ('delivered', 'cancelled', 'expired', 'rejected') THEN
    RAISE EXCEPTION 'ORDER_CANNOT_BE_CANCELLED: Order is in terminal status %', v_order.status
      USING ERRCODE = '23514';
  END IF;

  -- 4. Set transaction GUC to identify customer actor (used by notification trigger)
  PERFORM set_config('app.cancellation_actor', 'customer', true);

  -- 5. Atomically update order status to cancelled
  UPDATE public.orders
     SET status     = 'cancelled',
         updated_at = now()
   WHERE id = p_order_id
     AND customer_id = auth.uid()
     AND status IN ('pending', 'accepted', 'preparing', 'out_for_delivery')
  RETURNING * INTO v_order;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_STATE_CHANGED: Order could not be cancelled'
      USING ERRCODE = '23514';
  END IF;

  -- 6. If an active driver was assigned, release their capacity immediately
  IF v_order.driver_id IS NOT NULL THEN
    UPDATE public.driver_profiles
       SET current_order_id = NULL,
           updated_at       = now()
     WHERE user_id = v_order.driver_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'cancelled'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.cancel_order(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order(UUID) TO authenticated, service_role;
```

---

### 1.2 `public.pending_order_ttl`

Single source of truth for the 30-minute unclaimed order expiration threshold.

```sql
CREATE OR REPLACE FUNCTION public.pending_order_ttl()
RETURNS INTERVAL
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT INTERVAL '30 minutes';
$$;

REVOKE EXECUTE ON FUNCTION public.pending_order_ttl() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pending_order_ttl() TO authenticated, service_role;
```

---

### 1.3 `public.expire_stale_orders`

Server-side automated batch expiration for orders pending longer than 30 minutes.

```sql
CREATE OR REPLACE FUNCTION public.expire_stale_orders()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_expired_ids UUID[];
BEGIN
  -- Atomically expire stale pending orders based on server created_at vs now()
  WITH expired_rows AS (
    UPDATE public.orders
       SET status     = 'expired',
           updated_at = now()
     WHERE status = 'pending'
       AND driver_id IS NULL
       AND created_at < (now() - public.pending_order_ttl())
    RETURNING id
  )
  SELECT array_agg(id) INTO v_expired_ids FROM expired_rows;

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', coalesce(array_length(v_expired_ids, 1), 0),
    'expired_ids', coalesce(v_expired_ids, ARRAY[]::UUID[])
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.expire_stale_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_stale_orders() TO service_role;
```

---

### 1.4 `public.hide_order`

Soft-hides an order from the authenticated customer's order history.

```sql
CREATE OR REPLACE FUNCTION public.hide_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.customer_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: You can only hide your own orders.'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
     SET customer_hidden_at = now(),
         updated_at         = now()
   WHERE id = p_order_id
     AND customer_id = auth.uid();

  RETURN jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'hidden_at', now()
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.hide_order(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hide_order(UUID) TO authenticated, service_role;
```

---

### 1.5 Updated `public.claim_order`

Amended to enforce the 30-minute expiration TTL guard atomically inside the claim query.

```sql
CREATE OR REPLACE FUNCTION public.claim_order(p_order_id UUID, p_driver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  -- Caller self-claim validation
  IF p_driver_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Driver ID mismatch: caller must claim for their own account'
      USING ERRCODE = '42501';
  END IF;

  -- Role verification
  IF NOT (SELECT app_private.has_role('driver')) THEN
    RAISE EXCEPTION 'User is not a driver' USING ERRCODE = '42501';
  END IF;

  -- Capacity check: 1 active delivery
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE driver_id = p_driver_id
      AND status IN ('accepted', 'preparing', 'out_for_delivery')
  ) THEN
    RAISE EXCEPTION 'Driver already has an active order' USING ERRCODE = '23505';
  END IF;

  -- Internal maintenance GUC to satisfy orders_column_guard
  PERFORM set_config('app.order_maintenance', 'on', true);

  -- Atomic claim with 30-minute expiration TTL guard (FR-011)
  UPDATE public.orders
     SET driver_id   = p_driver_id,
         status      = 'accepted',
         accepted_at = now(),
         updated_at  = now()
   WHERE id = p_order_id
     AND status = 'pending'
     AND driver_id IS NULL
     AND created_at >= (now() - public.pending_order_ttl())
  RETURNING * INTO v_order;

  PERFORM set_config('app.order_maintenance', '', true);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false, 'order', null);
  END IF;

  -- Update driver active profile pointer
  UPDATE public.driver_profiles
     SET current_order_id = p_order_id,
         updated_at       = now()
   WHERE user_id = p_driver_id;

  RETURN jsonb_build_object('claimed', true, 'order', to_jsonb(v_order));
END;
$function$;
```

---

### 1.6 Updated `public.advance_order_status`

Hardened against concurrent cancellation race conditions (FR-016).

```sql
CREATE OR REPLACE FUNCTION public.advance_order_status(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_current_status public.order_status;
  v_next_status public.order_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_role('driver') THEN
    RAISE EXCEPTION 'ONLY_DRIVERS_CAN_ADVANCE_ORDERS' USING ERRCODE = '42501';
  END IF;

  SELECT status INTO v_current_status
    FROM public.orders
   WHERE id = p_order_id AND driver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_NOT_ASSIGNED' USING ERRCODE = 'P0002';
  END IF;

  v_next_status := CASE v_current_status
    WHEN 'accepted' THEN 'preparing'
    WHEN 'preparing' THEN 'out_for_delivery'
    WHEN 'out_for_delivery' THEN 'delivered'
    ELSE NULL
  END;

  IF v_next_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot advance from %', v_current_status
      USING ERRCODE = '23514';
  END IF;

  -- Guarded conditional update: prevents trigger failure if customer cancelled concurrently
  UPDATE public.orders
     SET status       = v_next_status,
         delivered_at = CASE WHEN v_next_status = 'delivered' THEN now() ELSE delivered_at END,
         updated_at   = now()
   WHERE id = p_order_id
     AND driver_id = auth.uid()
     AND status = v_current_status;

  IF NOT FOUND THEN
    -- Order was cancelled or changed state concurrently
    RETURN jsonb_build_object(
      'success', false,
      'order_id', p_order_id,
      'error', 'ORDER_STATUS_CHANGED',
      'message', 'Order is no longer in the expected status'
    );
  END IF;

  -- If delivered, clear driver active delivery slot
  IF v_next_status = 'delivered' THEN
    UPDATE public.driver_profiles
       SET current_order_id = NULL,
           updated_at       = now()
     WHERE user_id = auth.uid();
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', v_next_status);
END;
$function$;
```

---

### 1.7 Updated `public.get_available_orders`

Updated to exclude stale orders exceeding the 30-minute threshold.

```sql
CREATE OR REPLACE FUNCTION public.get_available_orders()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_pool JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_role('driver') THEN
    RAISE EXCEPTION 'ONLY_DRIVERS_CAN_VIEW_ORDER_POOL' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.driver_profiles
    WHERE user_id = auth.uid() AND is_available = true
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE driver_id = auth.uid()
      AND status IN ('accepted', 'preparing', 'out_for_delivery')
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', o.id,
               'storeName', o.restaurant_name,
               'storeAddress', r.address,
               'itemCount', (SELECT COUNT(*)::int FROM public.order_items oi WHERE oi.order_id = o.id),
               'createdAt', o.created_at
             ) ORDER BY o.created_at ASC
           ),
           '[]'::jsonb
         )
    INTO v_pool
    FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
   WHERE o.status = 'pending'
     AND o.driver_id IS NULL
     AND o.created_at >= (now() - public.pending_order_ttl()) -- FR-014 Expiration filter
     AND NOT EXISTS (
       SELECT 1 FROM public.driver_order_interactions doi
       WHERE doi.driver_id = auth.uid()
         AND doi.order_id = o.id
         AND doi.interaction_type = 'declined'
     );

  RETURN v_pool;
END;
$function$;
```

---

### 1.8 Updated `public.get_driver_history`

Amended to include orders cancelled by the customer while assigned to the driver.

```sql
CREATE OR REPLACE FUNCTION public.get_driver_history()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_history JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_role('driver') THEN
    RAISE EXCEPTION 'ONLY_DRIVERS_CAN_VIEW_HISTORY' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(h ORDER BY h.order_date DESC), '[]'::jsonb)
    INTO v_history
    FROM (
      -- 1. Completed orders
      SELECT o.id AS id,
             o.id AS order_id,
             o.restaurant_name AS store_name,
             o.delivered_at AS order_date,
             'completed' AS final_status,
             NULL::text AS release_reason
        FROM public.orders o
       WHERE o.driver_id = auth.uid()
         AND o.status = 'delivered'

      UNION ALL

      -- 2. Cancelled orders where caller was the assigned driver at cancellation time
      SELECT o.id AS id,
             o.id AS order_id,
             o.restaurant_name AS store_name,
             o.updated_at AS order_date,
             'cancelled' AS final_status,
             NULL::text AS release_reason
        FROM public.orders o
       WHERE o.driver_id = auth.uid()
         AND o.status = 'cancelled'

      UNION ALL

      -- 3. Declined orders (superseded by 'cancelled' once the order is cancelled)
      SELECT doi.id AS id,
             o.id AS order_id,
             o.restaurant_name AS store_name,
             doi.created_at AS order_date,
             'declined' AS final_status,
             NULL::text AS release_reason
        FROM public.driver_order_interactions doi
        JOIN public.orders o ON o.id = doi.order_id
       WHERE doi.driver_id = auth.uid()
         AND doi.interaction_type = 'declined'
         AND o.status IS DISTINCT FROM 'cancelled'

      UNION ALL

      -- 4. Released orders (superseded by 'cancelled' once the order is cancelled)
      SELECT doi.id AS id,
             o.id AS order_id,
             o.restaurant_name AS store_name,
             doi.created_at AS order_date,
             'released' AS final_status,
             doi.reason AS release_reason
        FROM public.driver_order_interactions doi
        JOIN public.orders o ON o.id = doi.order_id
       WHERE doi.driver_id = auth.uid()
         AND doi.interaction_type = 'released'
         AND o.status IS DISTINCT FROM 'cancelled'

      UNION ALL

      -- 5. Cancelled orders caller previously interacted with (declined/released) but was not assigned to at cancellation
      SELECT id, order_id, store_name, order_date, final_status, release_reason
        FROM (
          SELECT DISTINCT ON (o.id)
                 doi.id AS id,
                 o.id AS order_id,
                 o.restaurant_name AS store_name,
                 o.updated_at AS order_date,
                 'cancelled' AS final_status,
                 NULL::text AS release_reason
            FROM public.driver_order_interactions doi
            JOIN public.orders o ON o.id = doi.order_id
           WHERE doi.driver_id = auth.uid()
             AND o.status = 'cancelled'
             AND o.driver_id IS DISTINCT FROM auth.uid()
           ORDER BY o.id, doi.created_at DESC
        ) c
    ) h;

  RETURN v_history;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_driver_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_driver_history() TO authenticated, service_role;
```

---

## 2. Trigger Contracts

### 2.1 `validate_order_transition`

Amended to reopen customer cancellation across all active states and permit expiration.

```sql
CREATE OR REPLACE FUNCTION public.validate_order_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  -- Opt out under maintenance escape hatch (used by release_order to revert to pending)
  IF coalesce(current_setting('app.order_maintenance', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (
         (OLD.status = 'pending'          AND NEW.status IN ('accepted', 'cancelled', 'rejected', 'expired'))
      OR (OLD.status = 'accepted'         AND NEW.status IN ('preparing', 'cancelled'))
      OR (OLD.status = 'preparing'        AND NEW.status IN ('out_for_delivery', 'cancelled'))
      OR (OLD.status = 'out_for_delivery' AND NEW.status IN ('delivered', 'cancelled'))
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
        USING ERRCODE = '23514',
              HINT = 'Valid transitions are defined in OrderStatus.ts and must match this trigger. Cancelled is reachable from pending, accepted, preparing, out_for_delivery via customer cancel.';
    END IF;
  END IF;

  IF NEW.status = 'accepted' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;
  IF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
    NEW.delivered_at := now();
  END IF;

  RETURN NEW;
END;
$function$;
```

---

### 2.2 `emit_driver_pool_signal`

Updated to emit an invalidation signal when an order transitions to `expired`.

```sql
CREATE OR REPLACE FUNCTION public.emit_driver_pool_signal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    INSERT INTO public.driver_pool_signals (order_id, signal)
    VALUES (NEW.id, 'order_added');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'cancelled', 'rejected', 'expired') THEN
      INSERT INTO public.driver_pool_signals (order_id, signal)
      VALUES (NEW.id, 'order_claimed');
      -- Purge stale signals for the departed order
      DELETE FROM public.driver_pool_signals WHERE order_id = NEW.id;
    ELSIF OLD.status IN ('accepted', 'preparing', 'out_for_delivery')
         AND NEW.status = 'pending' THEN
      INSERT INTO public.driver_pool_signals (order_id, signal)
      VALUES (NEW.id, 'order_released');
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
```

---

### 2.3 `enqueue_order_notification`

Updated with actor-aware branching and customer expiration alerts.

```sql
CREATE OR REPLACE FUNCTION public.enqueue_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_event_type TEXT;
  v_target_role TEXT;
  v_title TEXT;
  v_body TEXT;
  v_deep_link TEXT;
  v_zone TEXT;
  v_total TEXT;
  v_actor TEXT;
BEGIN
  v_total := 'EGP ' || to_char(NEW.total_amount / 100.0, 'FM999990.00');
  v_deep_link := '/(customer)/orders/' || NEW.id;
  v_actor := coalesce(current_setting('app.cancellation_actor', true), '');

  IF TG_OP = 'INSERT' THEN
    SELECT address INTO v_zone FROM public.restaurants WHERE id = NEW.restaurant_id;
    INSERT INTO public.notification_events
      (event_type, order_id, target_role, title, body, deep_link_url, dedupe_key)
    VALUES (
      'new_order_pool', NEW.id, 'driver',
      'New order available',
      'Pickup from ' || coalesce(v_zone, 'the store') || ' · ' || v_total,
      '/(driver)/available-orders',
      NEW.id || ':new_order_pool:' || NEW.event_seq
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
    RETURN NEW;
  END IF;

  -- Status update transitions
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    v_event_type := 'order_accepted'; v_target_role := 'customer';
    v_title := 'Driver on the way!';
    v_body := 'Your order from ' || NEW.restaurant_name || ' has been accepted';

  ELSIF OLD.status = 'accepted' AND NEW.status = 'preparing' THEN
    v_event_type := 'order_preparing'; v_target_role := 'customer';
    v_title := 'Being prepared';
    v_body := 'Your order from ' || NEW.restaurant_name || ' is being prepared';

  ELSIF OLD.status = 'preparing' AND NEW.status = 'out_for_delivery' THEN
    v_event_type := 'order_out_for_delivery'; v_target_role := 'customer';
    v_title := 'Out for delivery';
    v_body := 'Your order from ' || NEW.restaurant_name || ' is on its way!';

  ELSIF OLD.status = 'out_for_delivery' AND NEW.status = 'delivered' THEN
    v_event_type := 'order_delivered'; v_target_role := 'customer';
    v_title := 'Delivered!';
    v_body := 'Your order from ' || NEW.restaurant_name || ' has been delivered';

  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    IF v_actor = 'customer' THEN
      -- Customer cancelled: suppress customer alert (no self-echo)
      IF NEW.driver_id IS NOT NULL THEN
        -- Alert assigned driver
        INSERT INTO public.notification_events
          (event_type, order_id, target_role, title, body, deep_link_url, dedupe_key)
        VALUES (
          'order_cancelled_by_customer', NEW.id, 'driver',
          'Order cancelled',
          'The customer cancelled your order from ' || NEW.restaurant_name,
          '/(driver)/available-orders',
          NEW.id || ':order_cancelled_by_customer:' || NEW.event_seq
        )
        ON CONFLICT (dedupe_key) DO NOTHING;
      END IF;
      RETURN NEW;
    ELSE
      -- Non-customer cancellation: notify customer
      v_event_type := 'order_cancelled'; v_target_role := 'customer';
      v_title := 'Order cancelled';
      v_body := 'Your order from ' || NEW.restaurant_name || ' has been cancelled';
    END IF;

  ELSIF NEW.status = 'expired' AND OLD.status IS DISTINCT FROM 'expired' THEN
    v_event_type := 'order_expired'; v_target_role := 'customer';
    v_title := 'Order expired';
    v_body := 'Your order from ' || NEW.restaurant_name || ' expired as no driver was available';

  ELSIF OLD.status IN ('accepted', 'preparing', 'out_for_delivery') AND NEW.status = 'pending' THEN
    SELECT address INTO v_zone FROM public.restaurants WHERE id = NEW.restaurant_id;

    INSERT INTO public.notification_events
      (event_type, order_id, target_role, title, body, deep_link_url, dedupe_key)
    VALUES (
      'order_released', NEW.id, 'customer',
      'Finding a new driver',
      'Your driver released your order from ' || NEW.restaurant_name || ' — we''re finding a new one',
      v_deep_link,
      NEW.id || ':order_released:' || NEW.event_seq
    )
    ON CONFLICT (dedupe_key) DO NOTHING;

    INSERT INTO public.notification_events
      (event_type, order_id, target_role, title, body, deep_link_url, dedupe_key)
    VALUES (
      'new_order_pool', NEW.id, 'driver',
      'New order available',
      'Pickup from ' || coalesce(v_zone, 'the store') || ' · ' || v_total,
      '/(driver)/available-orders',
      NEW.id || ':new_order_pool:' || NEW.event_seq
    )
    ON CONFLICT (dedupe_key) DO NOTHING;
    RETURN NEW;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notification_events
    (event_type, order_id, target_role, title, body, deep_link_url, dedupe_key)
  VALUES (
    v_event_type, NEW.id, v_target_role, v_title, v_body, v_deep_link,
    NEW.id || ':' || v_event_type || ':' || NEW.event_seq
  )
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$function$;
```

---

## 3. Policy & Job Cleanup

```sql
-- Drop legacy customer cancel direct-update policy
DROP POLICY IF EXISTS orders_update_own_customer_cancel ON public.orders;

-- Register pg_cron schedule if extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('expire_stale_orders_job');
    PERFORM cron.schedule(
      'expire_stale_orders_job',
      '* * * * *',
      'SELECT public.expire_stale_orders();'
    );
  END IF;
END $$;
```
