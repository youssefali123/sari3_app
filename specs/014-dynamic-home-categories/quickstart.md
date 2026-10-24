# Quickstart & Verification Guide: Dynamic Customizable Home Categories Grid

**Feature Branch**: `014-dynamic-home-categories`
**Date**: 2026-10-23

This guide provides step-by-step verification procedures to validate that the dynamic departments system, home screen grid, view-all screen, filtered browsing, and favorites consolidation work end-to-end.

---

## Prerequisites

1. Local development environment running Expo (SDK 57) on Android/iOS/Web:
   ```bash
   npm start
   ```
2. Supabase instance accessible with migration applied:
   ```bash
   # Migration file: supabase/migrations/20261024000001_dynamic_departments.sql
   npx supabase db push # or apply via Supabase SQL Editor
   ```

---

## Verification Scenarios

### Scenario 1: Home Screen Categories Grid (P1)
**Goal**: Verify that the top 6 active departments render in a 3-column grid replacing the old static two tiles.
1. Launch the app and select an operational area (e.g., "حي الزيتون").
2. Scroll to the "اطلب دلوقتي" section beneath the greeting banner.
3. **Verify**:
   - Exactly 6 category tiles are visible in a 3-column layout.
   - Each tile shows its respective image and Arabic name (مطاعم, سوبرماركت, صيدليات, لحوم ودواجن, مخبوزات وحلويات, مستلزمات حيوانات).
   - Pressing and holding a tile scales it down smoothly (0.95 scale).
   - "عرض الكل" action link is visible at the top-left (RTL end) of the section.

### Scenario 2: View All Departments Screen (P2)
**Goal**: Verify the dedicated full-screen departments list with search.
1. Tap "عرض الكل" on the home screen categories section header.
2. **Verify**:
   - App navigates to `/departments` (dedicated full-screen view).
   - Back button returns to the home screen.
   - All active departments are displayed in a scrollable 3-column grid.
3. Type "صيد" in the top search input.
4. **Verify**:
   - The grid filters immediately to show only "صيدليات".
   - Clearing the search input restores all departments.

### Scenario 3: Filtered Browse Navigation (P1)
**Goal**: Verify tapping a department opens the store list filtered by that department.
1. From either the home grid or the View All screen, tap "سوبرماركت".
2. **Verify**:
   - App navigates to the browse screen.
   - Header title displays "سوبرماركت".
   - Only stores belonging to the supermarket department in the active area are listed.
   - Sub-categories carousel displays tags relevant to that department.
3. Tap back to confirm smooth return to the previous screen.

### Scenario 4: Favorites Two-Tab Consolidation (P2)
**Goal**: Verify favorites screen displays exactly two tabs (`[ متاجر | منتجات ]`).
1. Navigate to the Favorites tab (`/favorites`).
2. **Verify**:
   - Segmented bar shows exactly two tabs: **"متاجر"** and **"منتجات"**.
   - The old 3-tab split ("مطاعم" / "متاجر" / "منتجات") is gone.
   - In "متاجر", all favorited stores appear with a department badge (e.g. `مطاعم`, `سوبرماركت`).

### Scenario 5: Dynamic Database Customization (P3)
**Goal**: Verify admin customization without app updates.
1. In Supabase SQL editor, insert a temporary new department:
   ```sql
   INSERT INTO public.departments (name, slug, display_order, is_active)
   VALUES ('أزهار وورود', 'flowers', 0, true);
   ```
2. Pull down to refresh the home screen in the mobile app.
3. **Verify**: "أزهار وورود" appears as the 1st tile in the grid immediately.
4. Set `is_active = false` on that department, refresh, and verify it disappears.
