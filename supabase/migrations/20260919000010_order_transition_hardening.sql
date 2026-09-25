-- Order hardening: close the driver-cancel loophole and protect immutable
-- order columns from direct client updates.
--
-- 1. validate_order_transition: removes accepted -> cancelled and
--    preparing -> cancelled. The only path into 'cancelled' is
--    pending -> cancelled (customer, via orders_update_own_customer_cancel).
-- 2. New orders_column_guard BEFORE UPDATE trigger: direct updates may only
--    change status / updated_at / accepted_at / delivered_at. Any other
--    column change raises. Internal maintenance (claim_order setting
--    driver_id) opts out via the transaction-local 'app.order_maintenance'
--    GUC — the only escape hatch.
-- 3. claim_order re-issued with the GUC escape so atomic claiming keeps
--    working; no behavioral change otherwise.
--
-- Note: order_items has no UPDATE policy at all, so item snapshot fields are
-- already unreachable by direct client updates; no guard needed there.

CREATE OR REPLACE FUNCTION public.validate_order_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
begin
  if new.status is distinct from old.status then
    if not (
         (old.status = 'pending'            and new.status in ('accepted', 'cancelled', 'rejected'))
      or (old.status = 'accepted'           and new.status = 'preparing')
      or (old.status = 'preparing'          and new.status = 'out_for_delivery')
      or (old.status = 'out_for_delivery'   and new.status = 'delivered')
    ) then
      raise exception 'Invalid order status transition: % -> %', old.status, new.status
        using errcode = '23514',
              hint = 'Valid transitions are defined in OrderStatus.ts and must match this trigger. Cancelled is reachable only from pending (customer cancel).';
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


CREATE OR REPLACE FUNCTION public.orders_column_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
begin
  -- Internal maintenance paths (claim_order assigning driver_id) opt out
  -- explicitly with a transaction-local GUC. Nothing else bypasses this.
  if coalesce(current_setting('app.order_maintenance', true), '') = 'on' then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'orders_column_guard: id is immutable' using errcode = '23514';
  end if;
  if new.customer_id is distinct from old.customer_id then
    raise exception 'orders_column_guard: customer_id is immutable' using errcode = '23514';
  end if;
  if new.driver_id is distinct from old.driver_id then
    raise exception 'orders_column_guard: driver_id is immutable outside claim_order' using errcode = '23514';
  end if;
  if new.restaurant_id is distinct from old.restaurant_id then
    raise exception 'orders_column_guard: restaurant_id is immutable' using errcode = '23514';
  end if;
  if new.restaurant_name is distinct from old.restaurant_name then
    raise exception 'orders_column_guard: restaurant_name is immutable' using errcode = '23514';
  end if;
  if new.delivery_address is distinct from old.delivery_address then
    raise exception 'orders_column_guard: delivery_address is immutable' using errcode = '23514';
  end if;
  if new.delivery_address_label is distinct from old.delivery_address_label then
    raise exception 'orders_column_guard: delivery_address_label is immutable' using errcode = '23514';
  end if;
  if new.payment_method is distinct from old.payment_method then
    raise exception 'orders_column_guard: payment_method is immutable' using errcode = '23514';
  end if;
  if new.coupon_code is distinct from old.coupon_code then
    raise exception 'orders_column_guard: coupon_code is immutable' using errcode = '23514';
  end if;
  if new.discount_amount is distinct from old.discount_amount then
    raise exception 'orders_column_guard: discount_amount is immutable' using errcode = '23514';
  end if;
  if new.subtotal_amount is distinct from old.subtotal_amount then
    raise exception 'orders_column_guard: subtotal_amount is immutable' using errcode = '23514';
  end if;
  if new.delivery_fee is distinct from old.delivery_fee then
    raise exception 'orders_column_guard: delivery_fee is immutable' using errcode = '23514';
  end if;
  if new.total_amount is distinct from old.total_amount then
    raise exception 'orders_column_guard: total_amount is immutable' using errcode = '23514';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'orders_column_guard: created_at is immutable' using errcode = '23514';
  end if;

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS orders_column_guard_before_update ON public.orders;
CREATE TRIGGER orders_column_guard_before_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.orders_column_guard();


CREATE OR REPLACE FUNCTION public.claim_order(p_order_id uuid, p_driver_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
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
  -- driver_id. Transaction-scoped; resets automatically.
  perform set_config('app.order_maintenance', 'on', true);

  -- Atomic claim: only a pending, unassigned order matches. If another
  -- driver got there first, zero rows update and FOUND is false.
  update public.orders
     set driver_id   = p_driver_id,
         status      = 'accepted',
         accepted_at = now(),
         updated_at  = now()
   where id = p_order_id
     and status = 'pending'
     and driver_id is null
    returning * into v_order;

  if not found then
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
