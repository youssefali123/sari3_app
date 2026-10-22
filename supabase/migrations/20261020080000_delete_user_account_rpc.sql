-- Migration: 20261020080000_delete_user_account_rpc.sql
-- Description: RPC function to allow authenticated customers to delete their own account and all associated data.

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_active_orders_count integer;
BEGIN
  -- 1. Ensure caller is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  -- 2. Guard: Cannot delete account while user has active orders as customer
  SELECT count(*)
  INTO v_active_orders_count
  FROM public.orders
  WHERE customer_id = v_user_id
    AND status IN ('pending', 'accepted', 'preparing', 'out_for_delivery');

  IF v_active_orders_count > 0 THEN
    RAISE EXCEPTION 'ACTIVE_ORDERS_EXIST'
      USING DETAIL = 'Cannot delete account while orders are active';
  END IF;

  -- 3. Guard: Cannot delete account if user has active delivery as driver
  IF EXISTS (
    SELECT 1 FROM public.driver_profiles
    WHERE user_id = v_user_id AND current_order_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'ACTIVE_ORDERS_EXIST'
      USING DETAIL = 'Cannot delete account while on an active delivery';
  END IF;

  -- 4. Clean up records with restrict foreign keys (coupon_redemptions)
  DELETE FROM public.coupon_redemptions WHERE customer_id = v_user_id;

  -- 5. Clean up device push tokens
  DELETE FROM public.device_push_tokens WHERE user_id = v_user_id;

  -- 6. Clean up saved addresses, favorites
  DELETE FROM public.saved_addresses WHERE customer_id = v_user_id;
  DELETE FROM public.favorite_stores WHERE customer_id = v_user_id;
  DELETE FROM public.favorite_products WHERE customer_id = v_user_id;

  -- 7. Clean up orders (cascades to order_items, interactions, signals, notifications)
  DELETE FROM public.orders WHERE customer_id = v_user_id;

  -- 8. If driver profile exists, clean up driver profile (cascades to driver_areas)
  DELETE FROM public.driver_profiles WHERE user_id = v_user_id;

  -- 9. Delete public profile
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 10. Delete from auth.users (cascades sessions, identities, tokens)
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Secure function permissions
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
