-- Regional Order Dispatch (feature 006): areas tree, store-area binding,
-- driver area assignments (safe-default-deny dispatch), and customer
-- area preference. Requires 005 (pending_order_ttl exists).
--
-- Execution order per contracts/database-schema.md.

-- 1. Areas reference table (adjacency-list tree)
CREATE TABLE IF NOT EXISTS public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  parent_area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_areas_parent_area_id ON public.areas(parent_area_id);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS areas_public_select ON public.areas;
CREATE POLICY areas_public_select ON public.areas
  FOR SELECT TO anon, authenticated
  USING (true);

-- 004 lesson: Supabase default privileges grant ALL on new tables —
-- revoke the write privileges so tamper attempts fail loudly, not silently.
REVOKE INSERT, UPDATE, DELETE ON public.areas FROM anon, authenticated;
GRANT SELECT ON public.areas TO anon, authenticated;

-- 2. Seed initial reference areas (Fayoum governorate + sub-areas)
INSERT INTO public.areas (id, name, parent_area_id) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Fayoum', NULL),
  ('20000000-0000-0000-0000-000000000002', 'Senours', '20000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'Itsa', '20000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 3. Stores bind to exactly one area
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT;

UPDATE public.restaurants
   SET area_id = '20000000-0000-0000-0000-000000000001'
 WHERE area_id IS NULL;

ALTER TABLE public.restaurants
  ALTER COLUMN area_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_area_id ON public.restaurants(area_id);

-- 4. Driver area assignments (explicit, non-inheriting, many-to-many)
CREATE TABLE IF NOT EXISTS public.driver_areas (
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(user_id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (driver_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_areas_area_id ON public.driver_areas(area_id);
CREATE INDEX IF NOT EXISTS idx_driver_areas_driver_id ON public.driver_areas(driver_id);

ALTER TABLE public.driver_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS driver_areas_driver_select ON public.driver_areas;
CREATE POLICY driver_areas_driver_select ON public.driver_areas
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.driver_areas FROM anon, authenticated;
GRANT SELECT ON public.driver_areas TO authenticated;

-- 5. Seed driver assignments: every existing driver profile joins Fayoum.
--    Fail loudly if the standard test driver accounts are missing (spec US6:
--    silent skipping is forbidden).
DO $$
DECLARE
  v_missing INT;
BEGIN
  SELECT count(*) INTO v_missing
    FROM (VALUES ('test-driver@example.com'), ('test-driver2@example.com')) AS t(email)
   WHERE NOT EXISTS (
     SELECT 1 FROM auth.users u WHERE u.email = t.email
   );
  IF v_missing > 0 THEN
    RAISE EXCEPTION 'REGIONAL_DISPATCH_SEED: % standard test driver account(s) not found — assignments aborted', v_missing;
  END IF;

  INSERT INTO public.driver_areas (driver_id, area_id)
  SELECT p.id, '20000000-0000-0000-0000-000000000001'
    FROM public.profiles p
   WHERE p.role = 'driver'
  ON CONFLICT (driver_id, area_id) DO NOTHING;
END $$;

-- 6. Customer area preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_selected_area_id ON public.profiles(selected_area_id);

-- 7. get_available_orders — regional scoping (safe-default-deny) on top of
--    all existing eligibility rules (005 TTL guard preserved).
CREATE OR REPLACE FUNCTION public.get_available_orders()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_pool JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_role('driver') THEN
    RAISE EXCEPTION 'ONLY_DRIVERS_CAN_VIEW_ORDER_POOL' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.driver_profiles
    WHERE user_id = auth.uid() AND is_available = true
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE driver_id = auth.uid()
      AND status IN ('accepted', 'preparing', 'out_for_delivery')
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', o.id,
               'storeName', o.restaurant_name,
               'storeNeighbourhood', r.address,
               'itemCount', (SELECT COUNT(*)::int FROM public.order_items oi WHERE oi.order_id = o.id),
               'createdAt', o.created_at
             ) ORDER BY o.created_at ASC
           ),
           '[]'::jsonb
         )
    INTO v_pool
    FROM public.orders o
    JOIN public.restaurants r ON r.id = o.restaurant_id
   WHERE o.status = 'pending'
     AND o.driver_id IS NULL
     AND o.created_at >= (now() - pending_order_ttl())
     AND NOT EXISTS (
       SELECT 1 FROM public.driver_order_interactions doi
       WHERE doi.driver_id = auth.uid()
         AND doi.order_id = o.id
         AND doi.interaction_type = 'declined'
     )
     -- Feature 006: regional scoping — only restaurants in the caller's
     -- explicitly assigned areas. Drivers with zero areas see nothing
     -- (safe-default-deny).
     AND EXISTS (
       SELECT 1 FROM public.driver_areas da
       WHERE da.driver_id = auth.uid()
         AND da.area_id = r.area_id
     );

  RETURN v_pool;
END;
$function$;
