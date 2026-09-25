-- Driver pool signal table (T045 remediation discovery).
--
-- WHY THIS EXISTS: Supabase Realtime enforces RLS on postgres_changes
-- subscriptions. The only SELECT policy on orders is
-- "customer_id = auth.uid() OR driver_id = auth.uid()", and a pending
-- unclaimed order has driver_id IS NULL — so drivers could NEVER receive
-- pool INSERT/claim/release events. Granting drivers SELECT on pending
-- orders would fix realtime but leak the customer's delivery_address in
-- the raw row (FR-004 violation, reachable via PostgREST by any driver).
--
-- SOLUTION: subscribe to this signal table instead. It carries ONLY the
-- order_id (an opaque UUID), the signal kind, and a timestamp — no PII —
-- so a "all authenticated users may read" policy leaks nothing. The client
-- reacts to signals by refetching the pool via get_available_orders(),
-- which keeps the privacy-safe projection as the single data path.

CREATE TABLE IF NOT EXISTS public.driver_pool_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  signal TEXT NOT NULL CHECK (signal IN ('order_added', 'order_claimed', 'order_released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dps_created_idx ON public.driver_pool_signals(created_at);

ALTER TABLE public.driver_pool_signals ENABLE ROW LEVEL SECURITY;

-- Payload is PII-free (order_id + kind + timestamp only).
DROP POLICY IF EXISTS dps_authenticated_select ON public.driver_pool_signals;
CREATE POLICY dps_authenticated_select ON public.driver_pool_signals
  FOR SELECT TO authenticated
  USING (true);

GRANT SELECT ON public.driver_pool_signals TO authenticated;

-- ===========================================================================
-- Trigger: emit signals on the pending-pool lifecycle moments
--   INSERT  with status 'pending'                    -> order_added
--   UPDATE  pending -> accepted                      -> order_claimed (claim_order)
--   UPDATE  active -> pending (release_order)        -> order_released
-- Claim also clears prior signals for the order (pool no longer lists it).
-- ===========================================================================
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
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'cancelled', 'rejected') THEN
      INSERT INTO public.driver_pool_signals (order_id, signal)
      VALUES (NEW.id, 'order_claimed');
      -- The order left the pool; drop its stale signals.
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

DROP TRIGGER IF EXISTS emit_driver_pool_signal_after ON public.orders;
CREATE TRIGGER emit_driver_pool_signal_after
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_driver_pool_signal();

-- Realtime only broadcasts tables enrolled in the supabase_realtime
-- publication (orders was enrolled during 001 setup).
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_pool_signals;
