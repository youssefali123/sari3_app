# Quickstart Verification Guide: Restaurant Cuisines & Visual Categories

**Feature**: `013-restaurant-categories`  
**Date**: 2026-10-23  

---

## Scenario 1: Database Migration & Schema Validation

Verify that `categories` and `restaurant_categories` exist and are populated.

```sql
-- Check categories
SELECT id, name, slug, image_url, icon_name, display_order FROM public.categories ORDER BY display_order;

-- Check restaurant associations
SELECT r.name AS restaurant_name, c.name AS category_name
FROM public.restaurants r
JOIN public.restaurant_categories rc ON r.id = rc.restaurant_id
JOIN public.categories c ON c.id = rc.category_id;
```

**Expected Outcome**: All categories have valid names, slugs, image URLs (or icon fallbacks), and restaurants are mapped to one or more categories.

---

## Scenario 2: Home Screen Visual Category Carousel

1. Launch mobile app.
2. Navigate to the Customer Home Screen (`/(customer)/(home)`).
3. Observe the new "تصنيفات المطابخ" section between the banner and the restaurants list.
4. Verify that each category card shows:
   - Category image loaded via `expo-image` (or fallback themed icon).
   - Arabic category title.
   - Clean horizontal scrolling.

**Expected Outcome**: Smooth 60fps horizontal carousel displaying visual category tiles.

---

## Scenario 3: Real-Time Category Filtering

1. In the carousel, tap on "مشويات" (Grills).
2. Verify visual feedback: "مشويات" tile displays an active highlight (brand gold border/glow).
3. Observe the restaurants section below: only restaurants tagged with "مشويات" (e.g. `Zitouni Grill`) appear.
4. Tap "برجر" (Burgers); observe list immediately switches to burger restaurants (e.g. `العرايشي`, `تريو`).

**Expected Outcome**: Filtering happens instantaneously (< 100ms) with zero layout jump.

---

## Scenario 4: Clearing and Resetting Category Filters

1. With a category active, tap the "الكل" (All) button, or tap the active category card again.
2. Verify the active state disappears.
3. Verify all available area restaurants re-appear in the list.

**Expected Outcome**: Immediate return to the unfiltered store list.

---

## Scenario 5: Category Filtering in Dedicated Browse Screen

1. Tap the "مطاعم" tile on the home screen to navigate to `/(customer)/(home)/browse?type=restaurant`.
2. Notice the horizontal category filter chips directly beneath the brand header.
3. Tap any category chip; verify the list filters to matching restaurants and the counter updates (e.g. "2 مطعم").

**Expected Outcome**: Consistent filtering UX across both home and browse screens.
