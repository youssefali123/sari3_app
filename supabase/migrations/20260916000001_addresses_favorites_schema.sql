-- Saved delivery addresses and customer favorites (stores & products).
-- Feature: 001-catalog-checkout-foundation

CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address_text TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_addresses_customer_idx ON public.saved_addresses(customer_id);

CREATE TABLE IF NOT EXISTS public.favorite_stores (
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, store_id)
);

CREATE TABLE IF NOT EXISTS public.favorite_products (
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS favorite_stores_customer_idx ON public.favorite_stores(customer_id);
CREATE INDEX IF NOT EXISTS favorite_products_customer_idx ON public.favorite_products(customer_id);
