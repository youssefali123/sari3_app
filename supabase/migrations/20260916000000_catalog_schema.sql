-- Catalog schema: unified store types, store categories, product categories, and binary add-ons.
-- Feature: 001-catalog-checkout-foundation

DO $$ BEGIN
  CREATE TYPE public.store_type AS ENUM ('restaurant', 'market');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_discount_type AS ENUM ('percentage', 'fixed_amount');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash_on_delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Unified store model: both restaurants and markets live in `restaurants`.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS type public.store_type NOT NULL DEFAULT 'restaurant';

CREATE INDEX IF NOT EXISTS restaurants_type_idx ON public.restaurants(type);

CREATE TABLE IF NOT EXISTS public.store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_categories_store_idx ON public.store_categories(store_id, display_order);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);

CREATE TABLE IF NOT EXISTS public.product_add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in piasters
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_add_ons_price_nonnegative CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS product_add_ons_product_idx ON public.product_add_ons(product_id);
