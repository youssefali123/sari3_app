-- Order-scoped driver info RPC: exposes strictly driver name, photo, and phone
-- during active fulfillment, and NULL upon terminal status or unassigned driver.
-- Feature: 001-catalog-checkout-foundation

CREATE OR REPLACE FUNCTION public.get_order_driver_info(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Order must belong to the calling customer.
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id AND customer_id = auth.uid()
  ) THEN
    RETURN NULL;
  END IF;

  -- Strictly active fulfillment; terminal states (delivered, cancelled,
  -- rejected) and unassigned orders revoke access entirely.
  SELECT jsonb_build_object(
    'order_id', o.id,
    'driver_name', p.full_name,
    'driver_photo_url', p.avatar_url,
    'driver_phone', p.phone
  ) INTO v_result
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.driver_id
  WHERE o.id = p_order_id
    AND o.driver_id IS NOT NULL
    AND o.status IN ('accepted', 'preparing', 'out_for_delivery');

  RETURN v_result;
END;
$$;
