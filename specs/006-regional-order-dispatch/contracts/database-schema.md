# Contract: Database Schema & Migration Specification

**Feature**: `006-regional-order-dispatch`  
**Migration Target**: `supabase/migrations/20260926000001_regional_order_dispatch.sql`

---

## 1. Migration Execution Order

The migration must run as a single atomic transaction in the following exact sequence:

1. **Create `public.areas` table**
2. **Enable RLS & create SELECT policy on `public.areas`**
3. **Seed initial reference areas** (`Fayoum`, `Senours`, `Itsa`)
4. **Add `area_id` to `public.restaurants`** (initially nullable)
5. **Backfill existing rows in `public.restaurants`** to `Fayoum` seed ID
6. **Set `public.restaurants.area_id` to `NOT NULL`**
7. **Create index on `public.restaurants(area_id)`**
8. **Create `public.driver_areas` junction table** with composite primary key
9. **Enable RLS & create SELECT policy on `public.driver_areas`**
10. **Seed test driver assignments** (`role = 'driver'` linked to `Fayoum`)
11. **Add `selected_area_id` to `public.profiles`**
12. **Create index on `public.profiles(selected_area_id)`**
13. **Replace `public.get_available_orders()`** with server-side area filter

---

## 2. Table Definitions

### 2.1 `public.areas`
```sql
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

GRANT SELECT ON public.areas TO anon, authenticated;
```

### 2.2 `public.restaurants` Alterations
```sql
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT;

-- Backfill
UPDATE public.restaurants
   SET area_id = '20000000-0000-0000-0000-000000000001'
 WHERE area_id IS NULL;

ALTER TABLE public.restaurants
  ALTER COLUMN area_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_restaurants_area_id ON public.restaurants(area_id);
```

### 2.3 `public.driver_areas`
```sql
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

GRANT SELECT ON public.driver_areas TO authenticated;
```

### 2.4 `public.profiles` Alterations
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_selected_area_id ON public.profiles(selected_area_id);
```

---

## 3. Seed Data Specification

```sql
-- Initial Reference Areas
INSERT INTO public.areas (id, name, parent_area_id) VALUES
  ('20000000-0000-0000-0000-000000000001', 'Fayoum', NULL),
  ('20000000-0000-0000-0000-000000000002', 'Senours', '20000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', 'Itsa', '20000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Seed Test Driver Assignments
INSERT INTO public.driver_areas (driver_id, area_id)
SELECT p.id, '20000000-0000-0000-0000-000000000001'
  FROM public.profiles p
 WHERE p.role = 'driver'
ON CONFLICT (driver_id, area_id) DO NOTHING;
```
