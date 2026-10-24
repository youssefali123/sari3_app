# Research & Technical Decisions: Restaurant Cuisines & Visual Categories

**Feature**: `013-restaurant-categories`  
**Date**: 2026-10-23  

---

## 1. Schema & Relation Design: Many-to-Many vs 1-to-Many

### Decision
Implement a normalized Many-to-Many relation between `restaurants` and `categories` via a junction table `restaurant_categories`.

### Rationale
- Restaurants in real-world food delivery apps serve multiple cuisines (e.g., an Egyptian grill house serving both "مشويات" and "أكل شعبي", or a diner serving "برجر" and "بيتزا").
- Locking restaurants to a single `category_id` (1-to-many) restricts discovery and frustrates customers when filtering by specific food types.
- A junction table `restaurant_categories` allows restaurants to belong to multiple cuisines without data duplication or array unnesting tricks in PostgreSQL.

### Alternatives Considered
1. **PostgreSQL Array Column (`restaurants.category_ids UUID[]`)**:
   - *Pros*: Single table modification, fewer joins.
   - *Cons*: Harder to enforce referential integrity (foreign keys on array elements are awkward), more difficult to query from Supabase client libraries, and harder to maintain indexes across array items compared to standard B-tree junction table indexes.
2. **PostgreSQL Enum**:
   - *Pros*: Type safety.
   - *Cons*: Cannot add images/icons, requires DDL migrations to add categories, cannot reorder or disable categories dynamically.

---

## 2. Image Asset Strategy & Fallback for Categories

### Decision
Each category row in `categories` will store:
- `image_url TEXT`: URL to category photography (stored in Supabase Storage or external CDN).
- `icon_name TEXT`: Optional Lucide icon identifier (e.g. `UtensilsCrossed`, `Flame`, `Pizza`) as an immediate visual fallback while images load or if no image is uploaded.

### Rationale
- User explicitly requested: *"عايز كل تصنيف يكون فيه امكانية اني اضيف له صوره"* (I want each category to have the ability to add an image to it).
- In mobile food delivery, visual photography of food (e.g. a hot burger, steaming pizza, sizzling grill skewer) dramatically increases user engagement and appetite compared to flat icons.
- Using `expo-image` with priority caching ensures instant rendering on cold starts after initial download.
- Fallback gradient + icon prevents broken empty rectangles if an image URL fails or is being uploaded.

---

## 3. Backward Compatibility & Migration Strategy

### Decision
1. Create `public.categories` and `public.restaurant_categories`.
2. Add a migration script with an idempotent data population step that maps existing text categories from `restaurants.category` into distinct records in `categories` and links them via `restaurant_categories`.
3. Seed default high-quality cuisine categories with placeholder images/icons:
   - `مشويات` (Grills)
   - `برجر` (Burgers)
   - `بيتزا وفطائر` (Pizza & Pies)
   - `أكل شعبي وكشري` (Egyptian / Traditional)
   - `شاورما وسريع` (Shawarma & Fast Food)
   - `حلويات ومخبوزات` (Desserts & Bakeries)
   - `عصائر ومشروبات` (Juices & Beverages)
4. Keep the legacy `restaurants.category` column in place (or sync it as a display summary) so that any legacy code or external readers continue functioning without runtime exceptions.

---

## 4. Query Performance & Indexing

### Decision
- Create index on `public.categories (display_order, is_active)` for instant category list loading.
- Create composite primary key and foreign key indexes on `public.restaurant_categories (category_id, restaurant_id)`.
- When fetching restaurants by category, TanStack Query will query restaurants joined on `restaurant_categories` or via an RPC/view for maximum query efficiency.
