-- Migration: 20261023000001_restaurant_categories.sql
-- Description: Create dedicated categories table with image support, many-to-many restaurant junction, RLS policies, and seed data.

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  icon_name TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  type public.store_type NOT NULL DEFAULT 'restaurant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ordering active categories
CREATE INDEX IF NOT EXISTS categories_display_order_idx
ON public.categories (display_order)
WHERE is_active = true;

-- 2. Create junction table for restaurant categories
CREATE TABLE IF NOT EXISTS public.restaurant_categories (
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, category_id)
);

-- Indexes for fast filtering and reverse lookups
CREATE INDEX IF NOT EXISTS restaurant_categories_category_id_idx
ON public.restaurant_categories (category_id);

CREATE INDEX IF NOT EXISTS restaurant_categories_restaurant_id_idx
ON public.restaurant_categories (restaurant_id);

-- 3. Row Level Security
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "restaurant_categories_public_read" ON public.restaurant_categories;
CREATE POLICY "restaurant_categories_public_read" ON public.restaurant_categories
FOR SELECT USING (true);

-- 4. Seed initial food cuisines with imagery and icons
INSERT INTO public.categories (id, name, slug, image_url, icon_name, display_order, type)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'مشويات',
    'grills',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
    'Flame',
    1,
    'restaurant'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'برجر',
    'burgers',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80',
    'Utensils',
    2,
    'restaurant'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'بيتزا وفطائر',
    'pizza',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
    'Pizza',
    3,
    'restaurant'
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'كشري وشعبي',
    'koshary',
    'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400&q=80',
    'Soup',
    4,
    'restaurant'
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'كبدة وسجق وحواوشي',
    'hawawshi',
    'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?w=400&q=80',
    'Sandwich',
    5,
    'restaurant'
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'فرايد تشيكن وسريع',
    'fried-chicken',
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&q=80',
    'UtensilsCrossed',
    6,
    'restaurant'
  ),
  (
    'c0000000-0000-0000-0000-000000000007',
    'حلويات ومخبوزات',
    'desserts',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&q=80',
    'Cake',
    7,
    'restaurant'
  ),
  (
    'c0000000-0000-0000-0000-000000000008',
    'عصائر ومشروبات',
    'drinks',
    'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80',
    'Coffee',
    8,
    'restaurant'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  image_url = EXCLUDED.image_url,
  icon_name = EXCLUDED.icon_name,
  display_order = EXCLUDED.display_order;

-- 5. Seed associations for existing restaurants
-- Zitouni Grill -> grills
INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000001'
FROM public.restaurants r WHERE r.name = 'Zitouni Grill'
ON CONFLICT DO NOTHING;

-- Pizza King -> pizza
INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000003'
FROM public.restaurants r WHERE r.name = 'Pizza King'
ON CONFLICT DO NOTHING;

-- Koshary Abou Tarek -> koshary
INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000004'
FROM public.restaurants r WHERE r.name = 'Koshary Abou Tarek'
ON CONFLICT DO NOTHING;

-- GAD Restaurant -> koshary & grills
INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000004'
FROM public.restaurants r WHERE r.name = 'GAD Restaurant'
ON CONFLICT DO NOTHING;

INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000001'
FROM public.restaurants r WHERE r.name = 'GAD Restaurant'
ON CONFLICT DO NOTHING;

-- العرايشي برجر & فرايد تشيكن -> burgers & fried-chicken
INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000002'
FROM public.restaurants r WHERE r.name = 'العرايشي برجر & فرايد تشيكن'
ON CONFLICT DO NOTHING;

INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000006'
FROM public.restaurants r WHERE r.name = 'العرايشي برجر & فرايد تشيكن'
ON CONFLICT DO NOTHING;

-- كشري العفريت -> koshary
INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000004'
FROM public.restaurants r WHERE r.name = 'كشري العفريت'
ON CONFLICT DO NOTHING;

-- تريو -> burgers & fried-chicken
INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000002'
FROM public.restaurants r WHERE r.name = 'تريو'
ON CONFLICT DO NOTHING;

INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000006'
FROM public.restaurants r WHERE r.name = 'تريو'
ON CONFLICT DO NOTHING;

-- تشويحة -> hawawshi
INSERT INTO public.restaurant_categories (restaurant_id, category_id)
SELECT r.id, 'c0000000-0000-0000-0000-000000000005'
FROM public.restaurants r WHERE r.name = 'تشويحة'
ON CONFLICT DO NOTHING;
