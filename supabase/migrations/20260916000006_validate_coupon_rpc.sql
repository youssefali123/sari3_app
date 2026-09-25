-- Read-only coupon validation RPC: validates code, active dates, store
-- restriction, minimum order amount, and usage limits without redeeming.
-- Feature: 001-catalog-checkout-foundation

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_store_id UUID,
  p_items JSONB,
  p_customer_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_subtotal INTEGER := 0;
  v_item JSONB;
  v_product RECORD;
  v_addon RECORD;
  v_addon_id TEXT;
  v_coupon RECORD;
  v_discount INTEGER := 0;
BEGIN
  IF p_customer_id IS NULL THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'discount_amount', 0,
      'discount_type', NULL,
      'rejection_reason', 'Authentication required'
    );
  END IF;

  -- Compute the canonical subtotal from catalog prices (server authority).
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb))
  LOOP
    SELECT id, price, is_available INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
      AND restaurant_id = p_store_id;
    IF NOT FOUND OR v_product.is_available IS NOT TRUE THEN
      RETURN jsonb_build_object(
        'is_valid', false,
        'discount_amount', 0,
        'discount_type', NULL,
        'rejection_reason', 'Cart contains unavailable products'
      );
    END IF;

    v_subtotal := v_subtotal + v_product.price * (v_item->>'quantity')::int;

    FOR v_addon_id IN SELECT jsonb_array_elements_text(COALESCE(v_item->'addon_ids', '[]'::jsonb))
    LOOP
      SELECT id, price, is_available INTO v_addon
      FROM public.product_add_ons
      WHERE id = v_addon_id::uuid AND product_id = v_product.id;
      IF NOT FOUND OR v_addon.is_available IS NOT TRUE THEN
        RETURN jsonb_build_object(
          'is_valid', false,
          'discount_amount', 0,
          'discount_type', NULL,
          'rejection_reason', 'Cart contains unavailable add-ons'
        );
      END IF;
      v_subtotal := v_subtotal + v_addon.price * (v_item->>'quantity')::int;
    END LOOP;
  END LOOP;

  SELECT * INTO v_coupon FROM public.coupons WHERE code = UPPER(TRIM(p_code));
  IF NOT FOUND OR v_coupon.is_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'discount_amount', 0,
      'discount_type', NULL,
      'rejection_reason', 'Invalid or inactive coupon code'
    );
  END IF;

  IF now() < v_coupon.starts_at
     OR (v_coupon.expires_at IS NOT NULL AND now() > v_coupon.expires_at) THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'discount_amount', 0,
      'discount_type', NULL,
      'rejection_reason', 'Coupon has expired'
    );
  END IF;

  IF v_coupon.store_id IS NOT NULL AND v_coupon.store_id <> p_store_id THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'discount_amount', 0,
      'discount_type', NULL,
      'rejection_reason', 'Coupon is not valid for this store'
    );
  END IF;

  IF v_coupon.min_order_amount IS NOT NULL AND v_subtotal < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'discount_amount', 0,
      'discount_type', NULL,
      'rejection_reason',
      format('Order minimum of %s EGP not met', (v_coupon.min_order_amount / 100.0)::money::text)
    );
  END IF;

  IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.current_redemptions >= v_coupon.max_redemptions THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'discount_amount', 0,
      'discount_type', NULL,
      'rejection_reason', 'Coupon usage limit reached'
    );
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

  RETURN jsonb_build_object(
    'is_valid', true,
    'discount_amount', v_discount,
    'discount_type', v_coupon.discount_type,
    'rejection_reason', NULL
  );
END;
$$;
