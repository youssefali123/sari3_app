-- Order notification pipeline triggers (feature 004-push-notifications).
-- Additive to 003: no 003 trigger/RPC semantics are touched. orders_column_guard
-- does not inspect event_seq, so the bump passes it (verified in data-model.md).

-- 1. Per-row transition counter, serialized by the row lock (race-free).
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS event_seq INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.orders_bump_event_seq()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.event_seq := coalesce(OLD.event_seq, 0) + 1;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS orders_event_seq_before_update ON public.orders;
CREATE TRIGGER orders_event_seq_before_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_bump_event_seq();

-- 2. Durable notification event writer. Persists event rows ONLY — no HTTP,
--    no Expo API calls here. Delivery is driven by the Database Webhook on
--    notification_events INSERTs. dedupe_key = order_id:event_type:event_seq
--    (row-lock-serialized seq; ON CONFLICT collapses retries of the same
--    transition while preserving legitimately repeated ones, e.g. releases).
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
BEGIN
  v_total := 'EGP ' || to_char(NEW.total_amount / 100.0, 'FM999990.00');
  v_deep_link := '/(customer)/orders/' || NEW.id;

  IF TG_OP = 'INSERT' THEN
    -- New unclaimed order entering the pool
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

  -- TG_OP = 'UPDATE' (trigger WHEN guard: OLD.status IS DISTINCT FROM NEW.status)
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
    v_event_type := 'order_cancelled'; v_target_role := 'customer';
    v_title := 'Order cancelled';
    v_body := 'Your order from ' || NEW.restaurant_name || ' has been cancelled';
  ELSIF OLD.status IN ('accepted', 'preparing', 'out_for_delivery') AND NEW.status = 'pending' THEN
    -- Driver released the order: customer is told a new driver is being
    -- found, and the re-entered order is pushed to eligible drivers —
    -- mirroring 003's emit_driver_pool_signal (Release = UPDATE to pending).
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
    RETURN NEW; -- not a notifiable transition (e.g. rejected, no-change)
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

REVOKE EXECUTE ON FUNCTION public.enqueue_order_notification() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_order_status_notification_insert ON public.orders;
CREATE TRIGGER trigger_order_status_notification_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.enqueue_order_notification();

DROP TRIGGER IF EXISTS trigger_order_status_notification_update ON public.orders;
CREATE TRIGGER trigger_order_status_notification_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.enqueue_order_notification();
