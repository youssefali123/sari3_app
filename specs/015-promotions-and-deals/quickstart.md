# Quickstart: Promotions & Deals Validation Guide

**Feature**: `015-promotions-and-deals`  
**Date**: 2026-10-24  
**Status**: Completed  

---

## Prerequisites

1. **Development Environment**:
   - Expo SDK 57 dev client / simulator running via `npm start`.
   - Node 20+, TypeScript 5+.
2. **Database Migration Applied**:
   - Migration adding `promotions.store_id`, `products.original_price`, `products.is_deal`, and indices applied to Supabase.
3. **Seed Data**:
   - At least 2 active promotional banners in Supabase:
     - Banner A with `store_id` pointing to an existing store.
     - Banner B with `store_id = NULL` (announcement banner).
   - At least 3 products with `original_price > price` belonging to stores in the active test area (e.g., Mansoura).

---

## Validation Scenario 1: Auto-Sliding Promotional Banners & Dual Tap Behavior

### Objective
Verify that the home screen banner carousel auto-slides, pauses on touch, updates pagination dots, and navigates conditionally based on `store_id`.

### Steps:
1. Open the customer home screen (`src/app/(customer)/(home)/index.tsx`).
2. Observe the banner carousel directly beneath the yellow greeting banner ("ماذا تريد اليوم؟").
3. Verify that the carousel automatically advances to the next banner after 3.5 seconds and the pagination dot advances smoothly to the second dot.
4. Press and hold down your finger on the banner for 6 seconds.
5. Verify that sliding is paused and does not change while held.
6. Release your finger; verify auto-sliding resumes after 3.5 seconds.
7. Tap **Banner A** (has `store_id`).
   - Expected: App navigates to `/store/[id]`.
8. Return to Home and swipe to **Banner B** (announcement only, `store_id = NULL`). Tap it.
   - Expected: No navigation occurs; screen stays on home screen.

---

## Validation Scenario 2: Home Screen Exclusive Deals Carousel (3:4 Vertical Cards)

### Objective
Verify that the "عروض حصرية (تنتهي قريباً)" section renders up to 10 deals with 3:4 aspect ratio cards, green percentage badges, strikethrough original prices, ratings, and store attributions.

### Steps:
1. On the home screen, scroll below the 6-department categories grid.
2. Observe the section titled **"عروض حصرية (تنتهي قريباً)"** with `<` chevron button on the left (RTL).
3. Inspect each product card:
   - Card aspect ratio is strictly 3:4.
   - Product image has a green discount pill badge (e.g. `خصم 20%`) and favorite heart button.
   - Body shows product name, store name (e.g. "صيدلية چيمي"), and rating.
   - Price displays struck-through original price (e.g. `~~365.0 ج.م~~`) in muted color alongside bold discounted price (`339.0 ج.م`).
4. Tap the favorite heart icon on any deal card.
   - Expected: Heart toggles filled/unfilled immediately without navigating away.
5. Tap the body of the deal card.
   - Expected: Navigates to `/product/[id]`.

---

## Validation Scenario 3: Full-Screen Dedicated Deals Page

### Objective
Verify that clicking the chevron button on the deals header opens the full-screen 2-column deals page with search and department filtering.

### Steps:
1. On the home screen "عروض حصرية" section header, tap the `<` chevron button.
2. Verify navigation to `/deals` with a top header "عروض حصرية" and back button.
3. Verify deals are displayed in a responsive 2-column grid of 3:4 cards.
4. Tap department filter tags (e.g., "صيدليات", "مطاعم").
   - Expected: Grid filters immediately to show only deals belonging to merchants in that department.
5. Type an item name in the search bar.
   - Expected: Grid filters live to match the search query.
6. Tap back button; returns to the home screen.

---

## Validation Scenario 4: Catalog-Wide Pricing Consistency

### Objective
Verify that discounted products reflect their discount badges and strikethrough original prices everywhere across the application.

### Steps:
1. Navigate directly to a merchant's store page (`/store/[id]`) that contains discounted products.
2. In the store menu list, observe the horizontal product card (`ProductRow` / `ProductCard`).
   - Expected: Strikethrough original price is displayed next to current price, with a discount badge (`-20%`).
3. Tap on the discounted product to open `/product/[id]`.
   - Expected: Product detail header displays original price with strikethrough and green discount percentage badge.
4. Verify that adding the item to the cart uses the discounted `price` (not `original_price`).

---

## Validation Scenario 5: Area Scoping

### Objective
Verify that changing delivery areas isolates deals to that area only.

### Steps:
1. On the home screen, switch delivery area from Area A to Area B using the header area picker.
2. Expected: The deals section refreshes automatically via TanStack Query and only displays products from merchants servicing Area B.
