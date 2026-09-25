-- Order snapshot columns: payment method, authoritative amounts, and immutable
-- order item add-on snapshots. Drops the legacy constraint that prevented
-- ordering the same product with different add-ons (composite identity).
-- Feature: 001-catalog-checkout-foundation

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method NOT NULL DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address_label TEXT;

-- Allow the same product with different add-on combinations in one order.
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_once_per_order;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS addon_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal INTEGER NOT NULL DEFAULT 0;
