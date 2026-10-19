-- RLS Optimization: InitPlan subqueries and redundant policy cleanup.
--
-- 1. Proven Redundant Policy Removals (PostgreSQL Permissive Policy Combination):
--   - `public.restaurants`: `restaurants_select_authenticated` (TO authenticated USING true) is
--     behaviorally redundant with `restaurants_public_select` (TO anon, authenticated USING true,
--     defined in 20260916000004_rls_policies.sql:22). Under PostgreSQL RLS, permissive policies
--     for the same role are combined with boolean OR (true OR true = true).
--   - `public.products`: `products_select_authenticated` is identical in behavior and redundancy
--     to restaurants, fully subsumed by `products_public_select` (20260916000004_rls_policies.sql:30).
--   - `public.orders`: `orders_customer_or_driver_select` (20260916000004_rls_policies.sql:102,
--     USING auth.uid() = customer_id OR auth.uid() = driver_id) is mathematically subsumed by
--     `orders_select_own_customer` (customer_id = (SELECT auth.uid())) OR `orders_select_assigned_driver`
--     (driver_id = (SELECT auth.uid())). The third surviving policy `orders_select_available_for_drivers`
--     covers pending pool orders. Removing this policy eliminates redundant evaluation without restricting rows.
--   - `public.order_items`: `order_items_customer_or_driver_select` (20260916000004_rls_policies.sql:107)
--     checks that the parent order has customer_id or driver_id matching auth.uid(). The surviving policy
--     `order_items_select_via_visible_orders` queries `FROM public.orders o WHERE o.id = order_items.order_id`.
--     Because `orders` enforces RLS, querying `orders` applies the caller's row-level visibility, which already
--     includes customer-owned and driver-assigned orders (as well as pool orders). Thus, the surviving policy
--     is strictly broader, making `order_items_customer_or_driver_select` completely subsumed.
--
-- 2. InitPlan Subquery Optimization (15 Policies):
--   - Replaces bare `auth.uid()` with `(SELECT auth.uid())`.
--   - PostgreSQL evaluates bare `auth.uid()` as a volatile function once per candidate row during scans.
--     Wrapping in `(SELECT auth.uid())` allows PostgreSQL to evaluate the function once per query
--     via an InitPlan, preserving exact boolean filtering logic and NULL semantics.
--   - All original target roles (`authenticated`), commands, USING conditions, and WITH CHECK
--     clauses are preserved exactly as defined in migrations 20260916000004, 20260920000001,
--     20260923000001, and 20260926000001.

-- ============================================================================
-- PART 1: DROP REDUNDANT POLICIES (4 POLICIES)
-- ============================================================================

DROP POLICY IF EXISTS "restaurants_select_authenticated" ON public.restaurants;
DROP POLICY IF EXISTS "products_select_authenticated" ON public.products;
DROP POLICY IF EXISTS "orders_customer_or_driver_select" ON public.orders;
DROP POLICY IF EXISTS "order_items_customer_or_driver_select" ON public.order_items;

-- ============================================================================
-- PART 2: RECREATE 15 POLICIES WITH (SELECT auth.uid()) INITPLAN
-- ============================================================================

-- Table: public.saved_addresses (4 policies, orig: 20260916000004_rls_policies.sql:78-92)
DROP POLICY IF EXISTS "saved_addresses_customer_select" ON public.saved_addresses;
CREATE POLICY "saved_addresses_customer_select" ON public.saved_addresses
    FOR SELECT TO authenticated
    USING (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "saved_addresses_customer_insert" ON public.saved_addresses;
CREATE POLICY "saved_addresses_customer_insert" ON public.saved_addresses
    FOR INSERT TO authenticated
    WITH CHECK (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "saved_addresses_customer_update" ON public.saved_addresses;
CREATE POLICY "saved_addresses_customer_update" ON public.saved_addresses
    FOR UPDATE TO authenticated
    USING (customer_id = (SELECT auth.uid()))
    WITH CHECK (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "saved_addresses_customer_delete" ON public.saved_addresses;
CREATE POLICY "saved_addresses_customer_delete" ON public.saved_addresses
    FOR DELETE TO authenticated
    USING (customer_id = (SELECT auth.uid()));

-- Table: public.favorite_stores (3 policies, orig: 20260916000004_rls_policies.sql:39-48)
DROP POLICY IF EXISTS "favorite_stores_customer_select" ON public.favorite_stores;
CREATE POLICY "favorite_stores_customer_select" ON public.favorite_stores
    FOR SELECT TO authenticated
    USING (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "favorite_stores_customer_insert" ON public.favorite_stores;
CREATE POLICY "favorite_stores_customer_insert" ON public.favorite_stores
    FOR INSERT TO authenticated
    WITH CHECK (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "favorite_stores_customer_delete" ON public.favorite_stores;
CREATE POLICY "favorite_stores_customer_delete" ON public.favorite_stores
    FOR DELETE TO authenticated
    USING (customer_id = (SELECT auth.uid()));

-- Table: public.favorite_products (3 policies, orig: 20260916000004_rls_policies.sql:51-60)
DROP POLICY IF EXISTS "favorite_products_customer_select" ON public.favorite_products;
CREATE POLICY "favorite_products_customer_select" ON public.favorite_products
    FOR SELECT TO authenticated
    USING (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "favorite_products_customer_insert" ON public.favorite_products;
CREATE POLICY "favorite_products_customer_insert" ON public.favorite_products
    FOR INSERT TO authenticated
    WITH CHECK (customer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "favorite_products_customer_delete" ON public.favorite_products;
CREATE POLICY "favorite_products_customer_delete" ON public.favorite_products
    FOR DELETE TO authenticated
    USING (customer_id = (SELECT auth.uid()));

-- Table: public.device_push_tokens (3 policies, orig: 20260923000001_create_device_push_tokens.sql:26-38)
DROP POLICY IF EXISTS "users_select_own_tokens" ON public.device_push_tokens;
CREATE POLICY "users_select_own_tokens" ON public.device_push_tokens
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_insert_own_tokens" ON public.device_push_tokens;
CREATE POLICY "users_insert_own_tokens" ON public.device_push_tokens
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "users_update_own_tokens" ON public.device_push_tokens;
CREATE POLICY "users_update_own_tokens" ON public.device_push_tokens
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Table: public.driver_order_interactions (1 policy, orig: 20260920000001_driver_fulfillment_schema.sql:35-37)
DROP POLICY IF EXISTS "driver_interactions_select" ON public.driver_order_interactions;
CREATE POLICY "driver_interactions_select" ON public.driver_order_interactions
    FOR SELECT TO authenticated
    USING (driver_id = (SELECT auth.uid()));

-- Table: public.driver_areas (1 policy, orig: 20260926000001_regional_order_dispatch.sql:63-65)
DROP POLICY IF EXISTS "driver_areas_driver_select" ON public.driver_areas;
CREATE POLICY "driver_areas_driver_select" ON public.driver_areas
    FOR SELECT TO authenticated
    USING (driver_id = (SELECT auth.uid()));
