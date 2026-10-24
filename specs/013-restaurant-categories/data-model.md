# Data Model: Restaurant Cuisines & Visual Categories

**Feature**: `013-restaurant-categories`  
**Date**: 2026-10-23  

---

## 1. Database Schema (PostgreSQL / Supabase)

### 1.1 `public.categories` Table

```sql
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                     -- Arabic display name (e.g. 'مشويات')
  slug TEXT UNIQUE NOT NULL,              -- URL/English slug (e.g. 'grills')
  image_url TEXT,                         -- Photo asset URL
  icon_name TEXT,                         -- Optional Lucide icon fallback
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  type public.store_type NOT NULL DEFAULT 'restaurant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for ordering active categories
CREATE INDEX IF NOT EXISTS categories_display_order_idx
ON public.categories (display_order)
WHERE is_active = true;
```

### 1.2 `public.restaurant_categories` Junction Table

```sql
CREATE TABLE IF NOT EXISTS public.restaurant_categories (
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, category_id)
);

-- Index for filtering restaurants by category
CREATE INDEX IF NOT EXISTS restaurant_categories_category_id_idx
ON public.restaurant_categories (category_id);

-- Index for reverse lookup (categories for a restaurant)
CREATE INDEX IF NOT EXISTS restaurant_categories_restaurant_id_idx
ON public.restaurant_categories (restaurant_id);
```

### 1.3 Row Level Security (RLS)

```sql
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON public.categories
FOR SELECT USING (is_active = true);

CREATE POLICY "restaurant_categories_public_read" ON public.restaurant_categories
FOR SELECT USING (true);
```

---

## 2. Domain Entities (TypeScript)

### 2.1 `CuisineCategory` (`src/features/restaurants/domain/entities/CuisineCategory.ts`)

```typescript
import { StoreType } from './Store';

export interface CuisineCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly imageUrl: string | null;
  readonly iconName: string | null;
  readonly displayOrder: number;
  readonly isActive: boolean;
  readonly type: StoreType;
}
```

### 2.2 Updated `Store` Entity (`src/features/restaurants/domain/entities/Store.ts`)

```typescript
export interface Store {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly imageUrl: string | null;
  readonly address: string | null;
  readonly rating: number | null;
  readonly isOpen: boolean;
  readonly category: string | null; // legacy display string preserved for compatibility
  readonly categories?: readonly CuisineCategory[]; // normalized multi-category array
  readonly type: StoreType;
  readonly areaId?: string | null;
}
```

---

## 3. Repository Interfaces

### 3.1 `StoreRepository` Additions (`src/features/restaurants/domain/repositories/StoreRepository.ts`)

```typescript
export interface StoreRepository {
  // Existing methods
  getStores(type?: StoreType, areaId?: string): Promise<Store[]>;
  getStoreById(id: string): Promise<Store | null>;
  getCategoriesByStoreId(storeId: string): Promise<StoreCategory[]>;

  // New cuisine category methods
  getCuisineCategories(type?: StoreType): Promise<CuisineCategory[]>;
  getStoresByCuisineCategory(categoryId: string, areaId?: string): Promise<Store[]>;
}
```
