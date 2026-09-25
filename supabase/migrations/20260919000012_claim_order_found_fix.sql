-- Critical fix: capture the claim outcome explicitly.
-- PERFORM set_config() overwrites PL/pgSQL's FOUND variable (PERFORM sets
-- FOUND to true - set_config always returns one row). With the GUC reset
-- PERFORM sitting between the UPDATE and the `if not found` check, a driver
-- who lost the claim race received claimed=true with a null order. Capture
-- FOUND immediately after the UPDATE instead.

-- Scope claim_order's column-guard escape to exactly one statement.
-- set_config(..., is_local := true) lasts until transaction end, so without
-- an explicit reset the escape leaked to later statements in the same
-- transaction (safe in production's one-transaction-per-RPC model, but
-- fragile for multi-statement admin/maintenance scripts).

CREATE OR REPLACE FUNCTION public.claim_order(p_order_id uuid, p_driver_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_claimed boolean;
begin
  -- The caller may only claim for themselves
  if p_driver_id is distinct from (select auth.uid()) then
    raise exception 'Driver ID mismatch: caller must claim for their own account'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  -- The caller must actually have the driver role
  if not (select app_private.has_role('driver')) then
    raise exception 'User is not a driver'
      using errcode = '42501';
  end if;

  -- One active delivery per driver. Backed by the
  -- orders_one_active_delivery_per_driver_idx unique partial index.
  if exists (
    select 1 from public.orders
    where driver_id = p_driver_id
      and status in ('accepted', 'preparing', 'out_for_delivery')
  ) then
    raise exception 'Driver already has an active order'
      using errcode = '23505'; -- unique_violation
  end if;

  -- Internal maintenance: allows the column guard trigger while assigning
  -- driver_id. Set immediately before and unset immediately after the
  -- orders UPDATE so the escape can never leak to later statements.
  perform set_config('app.order_maintenance', 'on', true);

  -- Atomic claim: only a pending, unassigned order matches. If another
  -- driver got there first, zero rows update.
  update public.orders
     set driver_id   = p_driver_id,
         status      = 'accepted',
         accepted_at = now(),
         updated_at  = now()
   where id = p_order_id
     and status = 'pending'
     and driver_id is null
    returning * into v_order;

  -- Capture the outcome BEFORE any PERFORM can clobber FOUND.
  v_claimed := coalesce(v_order.id is not null, false);

  perform set_config('app.order_maintenance', '', true);

  if not v_claimed then
    return jsonb_build_object('claimed', false, 'order', null);
  end if;

  -- Track the driver's current delivery
  update public.driver_profiles
     set current_order_id = p_order_id,
         updated_at      = now()
   where user_id = p_driver_id;

  return jsonb_build_object('claimed', true, 'order', to_jsonb(v_order));
end;
$function$;
