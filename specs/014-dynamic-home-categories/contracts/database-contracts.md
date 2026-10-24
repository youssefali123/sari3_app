# Database & RLS Contract: Departments & Store Vertical Schema

**Feature**: `014-dynamic-home-categories`

## 1. Migration Specification: `departments` table

```sql
-- 1. Create departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  icon_name TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast ordering of active departments
CREATE INDEX IF NOT EXISTS departments_display_order_idx
ON public.departments (display_order)
WHERE is_active = true;

-- 2. Alter restaurants table to link to departments
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS restaurants_area_department_idx
ON public.restaurants (area_id, department_id)
WHERE is_active = true;

-- 3. Alter categories table to support department-specific sub-categories
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS categories_department_id_idx
ON public.categories (department_id)
WHERE is_active = true;

-- 4. Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_public_read" ON public.departments;
CREATE POLICY "departments_public_read" ON public.departments
FOR SELECT USING (is_active = true);
```

---

## 2. Seed Data & Automatic Store Backfill Contract

```sql
-- Deterministic department IDs for seed predictability
INSERT INTO public.departments (id, name, slug, image_url, icon_name, display_order)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'مطاعم', 'restaurants', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80', 'Utensils', 1),
  ('d0000000-0000-0000-0000-000000000002', 'سوبرماركت', 'supermarket', 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&q=80', 'ShoppingBasket', 2),
  ('d0000000-0000-0000-0000-000000000003', 'صيدليات', 'pharmacies', 'https://images.unsplash.com/photo-1586015555751-63c2c5549ef0?w=500&q=80', 'Pill', 3),
  ('d0000000-0000-0000-0000-000000000004', 'لحوم ودواجن', 'meat-poultry', 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=500&q=80', 'Beef', 4),
  ('d0000000-0000-0000-0000-000000000005', 'مخبوزات وحلويات', 'bakeries-sweets', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80', 'Cake', 5),
  ('d0000000-0000-0000-0000-000000000006', 'مستلزمات حيوانات', 'pet-shops', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&q=80', 'Cat', 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  image_url = EXCLUDED.image_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order;

-- Backfill existing stores based on legacy type
UPDATE public.restaurants
SET department_id = 'd0000000-0000-0000-0000-000000000001'
WHERE (type = 'restaurant' OR type IS NULL) AND department_id IS NULL;

UPDATE public.restaurants
SET department_id = 'd0000000-0000-0000-0000-000000000002'
WHERE type = 'market' AND department_id IS NULL;

-- Link existing food cuisines to the restaurants department
UPDATE public.categories
SET department_id = 'd0000000-0000-0000-0000-000000000001'
WHERE department_id IS NULL;
```
