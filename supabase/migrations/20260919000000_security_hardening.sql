-- Security hardening for 001-catalog-checkout-foundation
-- 1. RLS on coupon_redemptions (no direct access; RPC-managed only).
-- 2. Restrict EXECUTE on the foundation RPCs to authenticated + service_role.
--    Functions default to PUBLIC EXECUTE; revoking only from anon leaves the
--    PUBLIC grant intact, so PUBLIC must be revoked explicitly. All three
--    RPCs also verify auth.uid() internally (defense in depth).

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.place_order(JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_coupon(TEXT, UUID, JSONB, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_order_driver_info(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.place_order(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, UUID, JSONB, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_order_driver_info(UUID) TO authenticated, service_role;
