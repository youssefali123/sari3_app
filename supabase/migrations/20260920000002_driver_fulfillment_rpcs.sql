-- Driver fulfillment RPCs: availability toggle, order pool, decline,
-- sequential advancement, release with mandatory reason, and history.
-- Feature: 003-driver-fulfillment
--
-- All functions are SECURITY DEFINER for server authority (Principle V).
-- EXECUTE is revoked from PUBLIC and granted explicitly (matches the
-- hardening applied to the 001 RPCs).

-- ============================================================================
-- 1. validate_order_transition — maintenance-escape amendment
--    Matches orders_column_guard: when app.order_maintenance = 'on',
--    skip the transition check so release_order can revert to pending.
-- ============================================================================
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

-- ============================================================================
-- 2. toggle_driver_availability
-- ============================================================================
CREATE OR REPLACE FUNCTION public.toggle_driver_availability(p_is_available BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_role('driver') THEN
    RAISE EXCEPTION 'ONLY_DRIVERS_CAN_TOGGLE_AVAILABILITY' USING ERRCODE = '42501';
  END IF;

  UPDATE public.driver_profiles
     SET is_available = p_is_available,
         updated_at   = now()
   WHERE user_id = auth.uid();

  RETURN jsonb_build_object('is_available', p_is_available);
END;
$function$;

-- ============================================================================
-- 3. get_available_orders — privacy-safe pre-acceptance pool
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
-- 4. decline_order — idempotent decline of an unclaimed order
-- ============================================================================
CREATE OR REPLACE FUNCTION public.decline_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_role('driver') THEN
    RAISE EXCEPTION 'ONLY_DRIVERS_CAN_DECLINE_ORDERS' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.driver_order_interactions (driver_id, order_id, interaction_type)
  VALUES (auth.uid(), p_order_id, 'declined')
  ON CONFLICT (driver_id, order_id) WHERE interaction_type = 'declined' DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ============================================================================
-- 5. advance_order_status — strict sequential lifecycle advancement
-- ============================================================================
CREATE OR REPLACE FUNCTION public.advance_order_status(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  -- orders.status is the order_status enum; TEXT here would fail the
  -- UPDATE assignment with 42804 (a text expression cannot feed an enum column).
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

  -- Direct update works cleanly: status/updated_at/delivered_at are allowlisted
  -- in orders_column_guard, and the transitions are allowed by validate_order_transition.
  UPDATE public.orders
     SET status       = v_next_status,
         delivered_at = CASE WHEN v_next_status = 'delivered' THEN now() ELSE delivered_at END,
         updated_at   = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'new_status', v_next_status);
END;
$function$;

-- ============================================================================
-- 6. release_order — self-report with mandatory reason, revert to pending
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_order(p_order_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_role('driver') THEN
    RAISE EXCEPTION 'ONLY_DRIVERS_CAN_RELEASE_ORDERS' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'RELEASE_REASON_REQUIRED: A valid reason must be provided to release an order.'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id
      AND driver_id = auth.uid()
      AND status IN ('accepted', 'preparing', 'out_for_delivery')
  ) THEN
    RAISE EXCEPTION 'ORDER_NOT_ACTIVE_OR_NOT_ASSIGNED' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.driver_order_interactions (driver_id, order_id, interaction_type, reason)
  VALUES (auth.uid(), p_order_id, 'released', TRIM(p_reason));

  -- Maintenance escape: scoped GUC set and unset around the single UPDATE.
  -- Never replace the PERFORM below with an inline set_config before/after
  -- unrelated statements — the GUC is transaction-scoped and would leak.
  PERFORM set_config('app.order_maintenance', 'on', true);

  UPDATE public.orders
     SET driver_id   = NULL,
         status      = 'pending',
         accepted_at = NULL,
         updated_at  = now()
   WHERE id = p_order_id;

  PERFORM set_config('app.order_maintenance', '', true);

  UPDATE public.driver_profiles
     SET current_order_id = NULL,
         updated_at       = now()
   WHERE user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- ============================================================================
-- 7. get_driver_history — completed + declined + released, newest-first
--    SECURITY DEFINER because released orders have driver_id = NULL and
--    would otherwise be hidden by standard orders RLS.
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
    ) h;

  RETURN v_history;
END;
$function$;

-- ============================================================================
-- Privileges: match the 001 RPC hardening (no PUBLIC EXECUTE)
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.toggle_driver_availability(BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_available_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decline_order(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.advance_order_status(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_order(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_driver_history() FROM PUBLIC;

-- Supabase's ALTER DEFAULT PRIVILEGES grants EXECUTE on new functions to
-- anon/authenticated/service_role at creation time, so revoking only PUBLIC
-- leaves anon able to call these SECURITY DEFINER RPCs. Remove anon too.
REVOKE EXECUTE ON FUNCTION public.toggle_driver_availability(BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_available_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.decline_order(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.advance_order_status(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.release_order(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_driver_history() FROM anon;

GRANT EXECUTE ON FUNCTION public.toggle_driver_availability(BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_orders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_order(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.advance_order_status(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_order(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_driver_history() TO authenticated, service_role;
