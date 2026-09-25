-- 003 review remediation: applied before feature close.
-- 1. get_driver_history gains a fourth UNION branch for cancelled orders
--    (spec US5-AS3), resolving ambiguity A1.
-- 2. get_available_orders renames its projection key 'storeAddress' to
--    'storeNeighbourhood' (I4) to avoid confusion with the customer address.
-- 3. validate_order_transition re-issued with an explicit scope comment on
--    the maintenance short-circuit (documentation only, no behavior change).
--
-- claim_order, release_order, decline_order, orders_column_guard are
-- verified correct and deliberately NOT touched here.

-- ============================================================================
-- 1. get_driver_history — add cancelled branch (I1 / US5-AS3)
--
-- Ambiguity A1 resolution: a cancelled order appears ONLY in the history of
-- drivers who previously interacted with it — i.e. drivers who DECLINED it
-- while pending, or drivers who had ACCEPTED it and later RELEASED it
-- (a release implies prior acceptance). Drivers who never interacted with
-- the order do not see it, globally or otherwise. A driver who accepted and
-- still held the order at cancellation time cannot exist, because the
-- lifecycle forbids accepted -> cancelled (cancellation is only reachable
-- from pending, per validate_order_transition).
-- ============================================================================
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

      -- Declined orders
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

      UNION ALL

      -- Released orders
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

      UNION ALL

      -- Cancelled orders the driver previously interacted with
      -- (A1: declined it, or accepted-then-released it — see header).
      -- The interaction row is the record of the driver's link to the
      -- order; the orders row alone cannot attribute it because cancelled
      -- orders never had (or no longer have) driver_id set.
      SELECT doi.id AS id,
             o.id AS order_id,
             o.restaurant_name AS store_name,
             o.updated_at AS order_date,
             'cancelled' AS final_status,
             NULL::text AS release_reason
        FROM public.driver_order_interactions doi
        JOIN public.orders o ON o.id = doi.order_id
       WHERE doi.driver_id = auth.uid()
         AND o.status = 'cancelled'
    ) h;

  RETURN v_history;
END;
$function$;

-- ============================================================================
-- 2. get_available_orders — rename projection key (I4)
--    'storeAddress' -> 'storeNeighbourhood': the value is the store's public
--    neighbourhood/street (restaurants.address), never the customer address.
-- ============================================================================
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

  -- Offline drivers see an empty pool (graceful UX instead of an error)
  IF NOT EXISTS (
    SELECT 1 FROM public.driver_profiles
    WHERE user_id = auth.uid() AND is_available = true
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  -- One active delivery at a time: empty pool while holding an order
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
               'storeNeighbourhood', r.address,
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
     AND NOT EXISTS (
       SELECT 1 FROM public.driver_order_interactions doi
       WHERE doi.driver_id = auth.uid()
         AND doi.order_id = o.id
         AND doi.interaction_type = 'declined'
     );

  RETURN v_pool;
END;
$function$;

-- ============================================================================
-- 3. validate_order_transition — documentation-only re-issue (item 5):
--    explicit scope statement on the maintenance short-circuit. Behavior is
--    byte-for-byte identical to the live function.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_order_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
begin
  -- MAINTENANCE ESCAPE — SCOPE WARNING:
  -- This bypass is deliberately scoped to claim_order and release_order
  -- ONLY. Any future SECURITY DEFINER function that sets
  -- app.order_maintenance = 'on' must independently guarantee it performs
  -- only already-validated transitions, because this trigger provides NO
  -- transition or column protection while the GUC is set.
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
