-- Row Level Security policies for the catalog & checkout foundation.
-- Feature: 001-catalog-checkout-foundation
--
-- Public catalog reading; customer-scoped addresses/favorites/orders;
-- coupon access restricted to SECURITY DEFINER RPCs only.

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_add_ons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Public catalog: readable by everyone.
DROP POLICY IF EXISTS restaurants_public_select ON public.restaurants;
CREATE POLICY restaurants_public_select ON public.restaurants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS store_categories_public_select ON public.store_categories;
CREATE POLICY store_categories_public_select ON public.store_categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS products_public_select ON public.products;
CREATE POLICY products_public_select ON public.products
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS product_add_ons_public_select ON public.product_add_ons;
CREATE POLICY product_add_ons_public_select ON public.product_add_ons
  FOR SELECT TO anon, authenticated USING (true);

-- Favorites: strictly customer-scoped.
DROP POLICY IF EXISTS favorite_stores_customer_select ON public.favorite_stores;
CREATE POLICY favorite_stores_customer_select ON public.favorite_stores
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS favorite_stores_customer_insert ON public.favorite_stores;
CREATE POLICY favorite_stores_customer_insert ON public.favorite_stores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS favorite_stores_customer_delete ON public.favorite_stores;
CREATE POLICY favorite_stores_customer_delete ON public.favorite_stores
  FOR DELETE TO authenticated USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS favorite_products_customer_select ON public.favorite_products;
CREATE POLICY favorite_products_customer_select ON public.favorite_products
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS favorite_products_customer_insert ON public.favorite_products;
CREATE POLICY favorite_products_customer_insert ON public.favorite_products
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS favorite_products_customer_delete ON public.favorite_products;
CREATE POLICY favorite_products_customer_delete ON public.favorite_products
  FOR DELETE TO authenticated USING (auth.uid() = customer_id);

-- Promotions: only active ones are publicly readable.
DROP POLICY IF EXISTS promotions_active_select ON public.promotions;
CREATE POLICY promotions_active_select ON public.promotions
  FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS promotion_targets_public_select ON public.promotion_targets;
CREATE POLICY promotion_targets_public_select ON public.promotion_targets
  FOR SELECT TO anon, authenticated USING (true);

-- Coupons: no direct SELECT; access only through SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS coupons_no_direct_select ON public.coupons;
CREATE POLICY coupons_no_direct_select ON public.coupons
  FOR SELECT TO authenticated USING (false);

-- Saved addresses: strictly customer-scoped CRUD.
DROP POLICY IF EXISTS saved_addresses_customer_select ON public.saved_addresses;
CREATE POLICY saved_addresses_customer_select ON public.saved_addresses
  FOR SELECT TO authenticated USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS saved_addresses_customer_insert ON public.saved_addresses;
CREATE POLICY saved_addresses_customer_insert ON public.saved_addresses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS saved_addresses_customer_update ON public.saved_addresses;
CREATE POLICY saved_addresses_customer_update ON public.saved_addresses
  FOR UPDATE TO authenticated USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

DROP POLICY IF EXISTS saved_addresses_customer_delete ON public.saved_addresses;
CREATE POLICY saved_addresses_customer_delete ON public.saved_addresses
  FOR DELETE TO authenticated USING (auth.uid() = customer_id);

-- Orders: customer or assigned driver may read.
-- Order creation is ONLY possible through the place_order RPC (SECURITY
-- DEFINER), so the legacy client-side INSERT policies are dropped: they
-- allowed client-controlled totals, violating server authority (Principle V).
DROP POLICY IF EXISTS orders_insert_own_customer ON public.orders;
DROP POLICY IF EXISTS order_items_insert_own_pending_order ON public.order_items;

DROP POLICY IF EXISTS orders_customer_or_driver_select ON public.orders;
CREATE POLICY orders_customer_or_driver_select ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = customer_id OR auth.uid() = driver_id);

-- Order items: readable if the parent order belongs to the customer or driver.
DROP POLICY IF EXISTS order_items_customer_or_driver_select ON public.order_items;
CREATE POLICY order_items_customer_or_driver_select ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (auth.uid() = o.customer_id OR auth.uid() = o.driver_id)
    )
  );

-- coupon_redemptions: no direct access; written only by the place_order RPC.
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
