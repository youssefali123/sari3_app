-- Product size/variant pricing (feature: variant pricing).
-- An item like "Pizza" can have "Small"/"Large" variants, each with its own
-- price. A product with zero variants keeps its flat price (unchanged
-- behavior); a product with variants REQUIRES a variant choice at order time
-- (enforced in place_order). Variant price replaces the base price; add-ons
-- are added on top exactly as before.

-- 1. Variant definitions
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON public.product_variants(product_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_variants_public_select ON public.product_variants;
CREATE POLICY product_variants_public_select ON public.product_variants
  FOR SELECT TO anon, authenticated
  USING (true);

-- 003/004 grant discipline: public read, loud-reject writes
REVOKE INSERT, UPDATE, DELETE ON public.product_variants FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;

-- 2. Order item variant snapshot (immutable history — Principle VII)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID,
  ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- 3. place_order — variant-aware pricing
CREATE OR REPLACE FUNCTION public.place_order(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_customer_id UUID;
  v_user_role TEXT;
  v_store_id UUID;
  v_store_name TEXT;
  v_store_is_open BOOLEAN;
  v_address_id UUID;
  v_address_text TEXT;
  v_address_label TEXT;
  v_item JSONB;
  v_product RECORD;
  v_addon_id TEXT;
  v_addon RECORD;
  v_addons_json JSONB;
  v_addon_subtotal INTEGER;
  v_variant_id UUID;
  v_variant_name TEXT;
  v_unit_price INTEGER;
  v_line_subtotal INTEGER;
  v_subtotal INTEGER := 0;
  v_items_json JSONB := '[]'::jsonb;
  v_coupon RECORD;
  v_coupon_id UUID := NULL;
  v_discount INTEGER := 0;
  v_delivery_fee INTEGER := 0;
  v_final_total INTEGER;
  v_order_id UUID;
  v_order JSONB;
BEGIN
  -- 1. Authentication check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  v_customer_id := auth.uid();

  -- 2. Server-side customer-role authorization check (Drivers cannot place customer orders)
  SELECT role::text INTO v_user_role
  FROM public.profiles
  WHERE id = v_customer_id;

  IF NOT FOUND OR v_user_role <> 'customer' THEN
    RAISE EXCEPTION 'ONLY_CUSTOMERS_CAN_PLACE_ORDERS';
  END IF;

  -- 3. Store validation
  v_store_id := (p_payload->>'store_id')::uuid;
  SELECT name, is_open INTO v_store_name, v_store_is_open
  FROM public.restaurants WHERE id = v_store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND';
  END IF;
  IF v_store_is_open IS NOT TRUE THEN
    RAISE EXCEPTION 'STORE_CLOSED';
  END IF;

  -- 4. Delivery address validation & immutable snapshot
  v_address_id := (p_payload->>'delivery_address_id')::uuid;
  SELECT address_text, label INTO v_address_text, v_address_label
  FROM public.saved_addresses
  WHERE id = v_address_id AND customer_id = v_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
  END IF;

  -- 5. Canonical price validation for items, variants and add-ons
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'items', '[]'::jsonb))
  LOOP
    IF COALESCE((v_item->>'quantity')::int, 0) < 1 THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
    END IF;

    SELECT id, name, price, is_available INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
      AND restaurant_id = v_store_id;
    IF NOT FOUND OR v_product.is_available IS NOT TRUE THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
    END IF;

    -- Variant resolution: a product with available variants REQUIRES a valid
    -- variant choice; the variant price replaces the base price. A product
    -- with no variants keeps its flat price and rejects stray variant ids.
    v_variant_id := NULLIF(v_item->>'variant_id', '');
    v_variant_name := NULL;
    v_unit_price := v_product.price;

    IF EXISTS (
      SELECT 1 FROM public.product_variants pv
       WHERE pv.product_id = v_product.id AND pv.is_available
    ) THEN
      IF v_variant_id IS NULL THEN
        RAISE EXCEPTION 'PRODUCT_VARIANT_REQUIRED';
      END IF;
      SELECT pv.id, pv.name, pv.price
        INTO v_variant_id, v_variant_name, v_unit_price
        FROM public.product_variants pv
       WHERE pv.id = v_variant_id
         AND pv.product_id = v_product.id
         AND pv.is_available;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
      END IF;
    ELSIF v_variant_id IS NOT NULL THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
    END IF;

    v_addons_json := '[]'::jsonb;
    v_addon_subtotal := 0;

    FOR v_addon_id IN SELECT jsonb_array_elements_text(COALESCE(v_item->'addon_ids', '[]'::jsonb))
    LOOP
      SELECT id, name, price, is_available INTO v_addon
      FROM public.product_add_ons
      WHERE id = v_addon_id::uuid AND product_id = v_product.id;
      IF NOT FOUND OR v_addon.is_available IS NOT TRUE THEN
        RAISE EXCEPTION 'ADDON_UNAVAILABLE';
      END IF;
      v_addons_json := v_addons_json || jsonb_build_object(
        'addon_id', v_addon.id,
        'name', v_addon.name,
        'price', v_addon.price
      );
      v_addon_subtotal := v_addon_subtotal + v_addon.price;
    END LOOP;

    v_line_subtotal := (v_unit_price + v_addon_subtotal) * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_line_subtotal;

    v_items_json := v_items_json || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'variant_id', v_variant_id,
      'variant_name', v_variant_name,
      'unit_price', v_unit_price,
      'quantity', (v_item->>'quantity')::int,
      'addon_snapshots', v_addons_json,
      'subtotal', v_line_subtotal
    );
  END LOOP;

  IF jsonb_array_length(v_items_json) = 0 THEN
    RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
  END IF;

  -- 6. Coupon validation & redemption (single coupon, row-locked)
  IF COALESCE(p_payload->>'coupon_code', '') <> '' THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = UPPER(TRIM(p_payload->>'coupon_code'))
    FOR UPDATE;
    IF NOT FOUND OR v_coupon.is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'COUPON_INVALID';
    END IF;
    IF now() < v_coupon.starts_at
       OR (v_coupon.expires_at IS NOT NULL AND now() > v_coupon.expires_at) THEN
      RAISE EXCEPTION 'COUPON_EXPIRED';
    END IF;
    IF v_coupon.store_id IS NOT NULL AND v_coupon.store_id <> v_store_id THEN
      RAISE EXCEPTION 'COUPON_STORE_RESTRICTED';
    END IF;
    IF v_coupon.min_order_amount IS NOT NULL AND v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'COUPON_MIN_ORDER_NOT_MET';
    END IF;
    IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.current_redemptions >= v_coupon.max_redemptions THEN
      RAISE EXCEPTION 'COUPON_USAGE_LIMIT_REACHED';
    END IF;

    IF v_coupon.discount_type = 'fixed_amount' THEN
      v_discount := LEAST(v_coupon.discount_value, v_subtotal);
    ELSE
      v_discount := ROUND((v_subtotal::numeric * v_coupon.discount_value) / 100.0);
      IF v_coupon.max_discount_amount IS NOT NULL THEN
        v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
      END IF;
    END IF;
    v_discount := LEAST(v_discount, v_subtotal);

    UPDATE public.coupons
    SET current_redemptions = current_redemptions + 1
    WHERE id = v_coupon.id;
    v_coupon_id := v_coupon.id;
  END IF;

  -- 7. Totals (delivery fee fixed at 0 in the foundation phase)
  v_final_total := v_subtotal - v_discount + v_delivery_fee;

  -- 8. Immutable snapshot persistence
  INSERT INTO public.orders (
    customer_id, restaurant_id, restaurant_name, status,
    delivery_address, delivery_address_label, payment_method,
    coupon_code, discount_amount, subtotal_amount, delivery_fee, total_amount
  ) VALUES (
    v_customer_id, v_store_id, v_store_name, 'pending',
    v_address_text, v_address_label, 'cash_on_delivery',
    NULLIF(TRIM(p_payload->>'coupon_code'), ''), v_discount, v_subtotal, v_delivery_fee, v_final_total
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, variant_id, variant_name, quantity, unit_price,
    addon_snapshots, subtotal
  )
  SELECT
    v_order_id,
    (item->>'product_id')::uuid,
    item->>'product_name',
    (item->>'variant_id')::uuid,
    item->>'variant_name',
    (item->>'quantity')::int,
    (item->>'unit_price')::int,
    item->'addon_snapshots',
    (item->>'subtotal')::int
  FROM jsonb_array_elements(v_items_json) AS item;

  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_redemptions (coupon_id, order_id, customer_id, discount_amount)
    VALUES (v_coupon_id, v_order_id, v_customer_id, v_discount);
  END IF;

  -- 9. Return serialized order (camelCase, matching the Order entity)
  SELECT to_jsonb(o) INTO v_order FROM public.orders o WHERE o.id = v_order_id;

  RETURN jsonb_build_object(
    'id', v_order->>'id',
    'customerId', v_order->>'customer_id',
    'driverId', v_order->>'driver_id',
    'storeId', v_order->>'restaurant_id',
    'storeName', v_order->>'restaurant_name',
    'status', v_order->>'status',
    'deliveryAddressSnapshot', v_order->>'delivery_address',
    'deliveryAddressLabel', v_order->>'delivery_address_label',
    'paymentMethod', v_order->>'payment_method',
    'couponCode', v_order->>'coupon_code',
    'discountAmount', v_order->>'discount_amount',
    'subtotalAmount', v_order->>'subtotal_amount',
    'deliveryFee', v_order->>'delivery_fee',
    'totalAmount', v_order->>'total_amount',
    'createdAt', v_order->>'created_at',
    'acceptedAt', v_order->>'accepted_at',
    'deliveredAt', v_order->>'delivered_at',
    'updatedAt', v_order->>'updated_at',
    'items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'orderId', oi.order_id,
        'productId', oi.product_id,
        'productName', oi.product_name,
        'variantName', oi.variant_name,
        'unitPrice', oi.unit_price,
        'quantity', oi.quantity,
        'subtotal', oi.subtotal,
        'addonSnapshots', oi.addon_snapshots
      )), '[]'::jsonb)
      FROM public.order_items oi WHERE oi.order_id = v_order_id
    )
  );
END;
$function$;
