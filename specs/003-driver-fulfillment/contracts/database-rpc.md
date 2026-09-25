# Database RPC Contracts: Driver Fulfillment (Amended)

**Feature**: Driver Fulfillment  
**Branch**: `003-driver-fulfillment`  
**Date**: 2026-09-20 (Amended)  
**Status**: Completed

These stored procedures run inside Supabase PostgreSQL as `SECURITY DEFINER` functions, enforcing server authority (Principle V) and concurrency safety (Principle VI) while integrating cleanly with existing column guards and state transition triggers.

---

## 1. `toggle_driver_availability` RPC

### Purpose
Toggles driver availability between Available (`true`) and Offline (`false`) directly on `public.driver_profiles`.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.toggle_driver_availability(p_is_available BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Processing Steps
1. Verify `auth.uid() IS NOT NULL`.
2. Verify caller has driver role: `app_private.has_role('driver')`.
3. Update `driver_profiles`:
   ```sql
   UPDATE public.driver_profiles
      SET is_available = p_is_available,
          updated_at   = now()
    WHERE user_id = auth.uid();
   ```
4. Return `{ "is_available": p_is_available }`.

---

## 2. `get_available_orders` RPC

### Purpose
Returns real-time unclaimed orders for the calling driver. Customer personal details (address, phone) are strictly omitted.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.get_available_orders()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Processing Steps
1. Verify `auth.uid() IS NOT NULL`.
2. Verify caller has driver role: `app_private.has_role('driver')`.
3. Verify driver availability:
   ```sql
   IF NOT EXISTS (
     SELECT 1 FROM public.driver_profiles
     WHERE user_id = auth.uid() AND is_available = true
   ) THEN
     -- Returning an empty array when offline provides a clean, graceful UX
     RETURN '[]'::jsonb;
   END IF;
   ```
4. Check active orders: If caller already has an active order (`status IN ('accepted', 'preparing', 'out_for_delivery')`), return `'[]'::jsonb`.
5. Query unclaimed orders:
   ```sql
   SELECT jsonb_agg(
            jsonb_build_object(
              'id', o.id,
              'storeName', o.restaurant_name,
              'storeNeighbourhood', r.address,
              'itemCount', (SELECT COUNT(*)::int FROM public.order_items oi WHERE oi.order_id = o.id),
              'createdAt', o.created_at
            ) ORDER BY o.created_at ASC
          )
     FROM public.orders o
     JOIN public.restaurants r ON r.id = o.restaurant_id
    WHERE o.status = 'pending'
      AND o.driver_id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.driver_order_interactions doi
        WHERE doi.driver_id = auth.uid()
          AND doi.order_id = o.id
          AND doi.interaction_type = 'declined'
      );
   ```
6. Return JSON array or `'[]'::jsonb` if null.

---

## 3. `claim_order` RPC (Existing, Hardened)

### Purpose
Atomically assigns an unclaimed order to the calling driver. This RPC is **already live** in the database (hardened with GUC escape and self-claim checks).

### Signature
```sql
CREATE OR REPLACE FUNCTION public.claim_order(p_order_id UUID, p_driver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO '';
```

### Live Implementation Features
- Validates caller identity: `p_driver_id = auth.uid()`.
- Validates driver role: `app_private.has_role('driver')`.
- Enforces single active delivery: checks `orders` for existing active delivery.
- Uses scoped GUC escape: `PERFORM set_config('app.order_maintenance', 'on', true);` before updating, reset immediately after.
- Atomic conditional update: `UPDATE orders SET driver_id = p_driver_id, status = 'accepted', accepted_at = now() WHERE id = p_order_id AND status = 'pending' AND driver_id IS NULL`.
- Updates `driver_profiles.current_order_id = p_order_id`.
- Returns `{ "claimed": boolean, "order": jsonb }`.

---

## 4. `decline_order` RPC

### Purpose
Records a driver's explicit decline of an unclaimed order. Does not touch the `orders` row.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.decline_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Processing Steps
1. Verify `auth.uid() IS NOT NULL` and `app_private.has_role('driver')`.
2. Insert interaction row:
   ```sql
   INSERT INTO public.driver_order_interactions (driver_id, order_id, interaction_type)
   VALUES (auth.uid(), p_order_id, 'declined')
   ON CONFLICT (driver_id, order_id) WHERE interaction_type = 'declined' DO NOTHING;
   ```
3. Return `{ "success": true }`.

---

## 5. `advance_order_status` RPC

### Purpose
Advances the driver's active order to the next sequential lifecycle state. No status parameter accepted.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.advance_order_status(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Processing Steps
1. Verify `auth.uid() IS NOT NULL` and `app_private.has_role('driver')`.
2. Verify order ownership:
   ```sql
   SELECT status INTO v_current_status
   FROM public.orders
   WHERE id = p_order_id AND driver_id = auth.uid();

   IF NOT FOUND THEN
     RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_NOT_ASSIGNED';
   END IF;
   ```
3. Determine next status:
   ```sql
   v_next_status := CASE v_current_status
     WHEN 'accepted' THEN 'preparing'
     WHEN 'preparing' THEN 'out_for_delivery'
     WHEN 'out_for_delivery' THEN 'delivered'
     ELSE NULL
   END;

   IF v_next_status IS NULL THEN
     RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot advance from %', v_current_status;
   END IF;
   ```
4. Execute update:
   ```sql
   -- Direct update works cleanly: status/updated_at/delivered_at are allowlisted
   -- in orders_column_guard, and the transitions are allowed by validate_order_transition.
   UPDATE public.orders
      SET status       = v_next_status,
          delivered_at = CASE WHEN v_next_status = 'delivered' THEN now() ELSE delivered_at END,
          updated_at   = now()
    WHERE id = p_order_id;
   ```
5. Return `{ "order_id": p_order_id, "new_status": v_next_status }`.

---

## 6. `release_order` RPC

### Purpose
Self-report inability to complete an active order with mandatory reason. Reverts order to `pending` with `driver_id = NULL` and clears the driver's active order pointer.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.release_order(p_order_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Processing Steps
1. Verify `auth.uid() IS NOT NULL` and `app_private.has_role('driver')`.
2. Validate reason:
   ```sql
   IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
     RAISE EXCEPTION 'RELEASE_REASON_REQUIRED: A valid reason must be provided to release an order.';
   END IF;
   ```
3. Verify caller is assigned driver of an active order:
   ```sql
   IF NOT EXISTS (
     SELECT 1 FROM public.orders
     WHERE id = p_order_id
       AND driver_id = auth.uid()
       AND status IN ('accepted', 'preparing', 'out_for_delivery')
   ) THEN
     RAISE EXCEPTION 'ORDER_NOT_ACTIVE_OR_NOT_ASSIGNED';
   END IF;
   ```
4. Record release interaction:
   ```sql
   INSERT INTO public.driver_order_interactions (driver_id, order_id, interaction_type, reason)
   VALUES (auth.uid(), p_order_id, 'released', TRIM(p_reason));
   ```
5. Revert order using GUC maintenance escape (bypasses `orders_column_guard` and `validate_order_transition`):
   ```sql
   PERFORM set_config('app.order_maintenance', 'on', true);

   UPDATE public.orders
      SET driver_id   = NULL,
          status      = 'pending',
          accepted_at = NULL,
          updated_at  = now()
    WHERE id = p_order_id;

   PERFORM set_config('app.order_maintenance', '', true);
   ```
6. Clear driver's active order pointer:
   ```sql
   UPDATE public.driver_profiles
      SET current_order_id = NULL,
          updated_at       = now()
    WHERE user_id = auth.uid();
   ```
7. Return `{ "success": true }`.

---

## 7. `get_driver_history` RPC

### Purpose
Returns driver's fulfillment history (completed, declined, released, cancelled) newest-first. Must be `SECURITY DEFINER` because released orders have `driver_id = NULL` and would otherwise be hidden by standard orders RLS.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.get_driver_history()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Processing Steps
1. Verify `auth.uid() IS NOT NULL` and `app_private.has_role('driver')`.
2. Union completed orders and interaction logs:
   ```sql
   SELECT jsonb_agg(h ORDER BY h.order_date DESC)
   FROM (
     -- Completed orders
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

     -- Declined orders (superseded by 'cancelled' once cancelled)
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

      -- Released orders (superseded by 'cancelled' once cancelled)
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

     -- Cancelled orders the driver previously interacted with (US5-AS3).
     -- Ambiguity A1 resolution: ONLY drivers who declined the order while
     -- pending, or who had accepted it and later released it (a release
     -- implies prior acceptance), see the cancelled entry. Drivers who
     -- never interacted with the order do not see it. A driver holding the
     -- order at cancellation time cannot exist because accepted -> cancelled
     -- is forbidden by validate_order_transition.
     --
     -- Dedupe (follow-up remediation): the cancelled entry SUPERSEDES the
     -- driver's earlier declined/released entry for the same order, so each
     -- order appears exactly once with its final status. DISTINCT ON
     -- (order_id) collapses multiple interactions by the same driver.
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
          ORDER BY o.id, doi.created_at DESC
       ) c
   ) h;
   ```
3. Return JSON array or `'[]'::jsonb`.

---

## 8. Trigger Update: `validate_order_transition` Amendment

### Purpose
Update `validate_order_transition` to bypass transition checking when `app.order_maintenance = 'on'` (matching `orders_column_guard`).

```sql
CREATE OR REPLACE FUNCTION public.validate_order_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
begin
  -- Opt out under maintenance escape hatch (used by release_order to revert to pending)
  if coalesce(current_setting('app.order_maintenance', true), '') = 'on' then
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
         (old.status = 'pending'            and new.status in ('accepted', 'cancelled', 'rejected'))
      or (old.status = 'accepted'           and new.status = 'preparing')
      or (old.status = 'preparing'          and new.status = 'out_for_delivery')
      or (old.status = 'out_for_delivery'   and new.status = 'delivered')
    ) then
      raise exception 'Invalid order status transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  if new.status = 'accepted' and new.accepted_at is null then
    new.accepted_at := now();
  end if;
  if new.status = 'delivered' and new.delivered_at is null then
    new.delivered_at := now();
  end if;

  return new;
end;
$function$;
```
