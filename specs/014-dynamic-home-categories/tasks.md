# Tasks: Dynamic Customizable Home Categories Grid

**Branch**: `014-dynamic-home-categories`
**Input**: Design artifacts from `specs/014-dynamic-home-categories/` (`spec.md`, `plan.md`, `data-model.md`, `contracts/`, `research.md`, `quickstart.md`)
**Status**: Ready for execution

---

## Phase 1: Setup (Migration & Shared Infrastructure)

**Purpose**: Database schema, migration script, seed data, and Supabase TypeScript types.

- [X] T001 Create Supabase migration `supabase/migrations/20261024000001_dynamic_departments.sql` with `departments` table, RLS policy, indexes, `department_id` foreign keys on `restaurants` and `categories`, seed data (6 core verticals), and automatic store backfill
- [X] T002 Apply migration `supabase/migrations/20261024000001_dynamic_departments.sql` to the Supabase database
- [X] T003 [P] Update database TypeScript definitions in `src/shared/types/supabase.ts` to include `departments` table and `department_id` on `restaurants` and `categories`

---

## Phase 2: Foundational (Clean Architecture Feature Domain & Infrastructure)

**Purpose**: Core domain entities, repository contracts, Supabase repository, and TanStack Query hook that MUST be complete before user stories can render data.

**⚠️ CRITICAL**: Blocking prerequisites for all user stories.

- [X] T004 [P] Create `Department` domain entity in `src/features/departments/domain/entities/Department.ts`
- [X] T005 [P] Create `DepartmentRepository` domain interface in `src/features/departments/domain/repositories/DepartmentRepository.ts`
- [X] T006 Implement `SupabaseDepartmentRepository` in `src/features/departments/infrastructure/SupabaseDepartmentRepository.ts`
- [X] T007 Implement `useDepartments` hook in `src/features/departments/application/hooks/useDepartments.ts` with TanStack Query caching (`['departments', 'active']`)
- [X] T008 [P] Extend `Store` domain entity in `src/features/restaurants/domain/entities/Store.ts` with `departmentId` and `departmentName`
- [X] T009 Extend `SupabaseStoreRepository` in `src/features/restaurants/infrastructure/SupabaseStoreRepository.ts` to support filtering stores by `departmentId`

**Checkpoint**: Foundation ready — department queries and store-department associations are functional.

---

## Phase 3: User Story 1 - Browse Home Categories Grid (Priority: P1) 🎯 MVP

**Goal**: Customer sees the top 6 active categories in a responsive 3-column grid under "اطلب دلوقتي" on the home screen, with smooth press animations, skeleton loading state, and tap navigation.

**Independent Test**: Open home screen, verify 6 category tiles render with correct images and Arabic names, tap any tile, and confirm navigation to filtered browse screen.

- [X] T010 [P] [US1] Create `DepartmentTile` component in `src/features/departments/presentation/components/DepartmentTile.tsx` with image, fallback icon, scale animation (0.95), and touch feedback
- [X] T011 [US1] Create `HomeDepartmentsGrid` component in `src/features/departments/presentation/components/HomeDepartmentsGrid.tsx` with 3-column layout, section header ("اطلب دلوقتي" with "عرض الكل" action), skeleton loading placeholders, and empty fallback
- [X] T012 [US1] Integrate `HomeDepartmentsGrid` into `src/app/(customer)/(home)/index.tsx`, replacing the hardcoded static two-tile "مطاعم" / "ماركت" row

**Checkpoint**: User Story 1 (MVP) is fully functional — customer sees dynamic 3-column categories grid on the home screen.

---

## Phase 4: User Story 2 - View All Categories Screen (Priority: P2)

**Goal**: Customer taps "عرض الكل" on the home screen and navigates to a dedicated full-screen page (`/(customer)/(home)/departments`) displaying all active departments in a 3-column grid with a real-time search bar.

**Independent Test**: Tap "عرض الكل" from home screen, verify navigation to `/departments`, scroll through all active departments, type in search bar to filter, and tap a department to navigate to its browse screen.

- [X] T013 [US2] Implement dedicated full-screen departments route in `src/app/(customer)/(home)/departments.tsx` with header back button, real-time search input, and responsive 3-column scrollable grid
- [X] T014 [US2] Wire "عرض الكل" action link in `src/features/departments/presentation/components/HomeDepartmentsGrid.tsx` to navigate to `/(customer)/(home)/departments`

**Checkpoint**: User Story 2 is complete — customer can discover and search all departments on a dedicated full-screen page.

---

## Phase 5: User Story 3 - Category-Filtered Browse Screen (Priority: P1)

**Goal**: Tapping a department tile lands the customer on `browse.tsx` showing only stores belonging to that department within the active area, dynamic screen title, and department-scoped sub-categories carousel.

**Independent Test**: Tap "صيدليات" or "سوبرماركت", confirm screen title reflects the department name, verify only stores belonging to that department appear, and verify empty state when no stores exist in that area.

- [X] T015 [US3] Update route parameters handling in `src/app/(customer)/(home)/browse.tsx` to accept and filter by `departmentId` and `departmentName`
- [X] T016 [US3] Update browse screen header in `src/app/(customer)/(home)/browse.tsx` to dynamically set title and subtitle from the selected department, with friendly empty state when no stores match
- [X] T017 [US3] Update sub-categories carousel integration in `src/app/(customer)/(home)/browse.tsx` to support department-scoped sub-categories

**Checkpoint**: User Story 3 is complete — category browsing displays correctly filtered stores and department sub-categories.

---

## Phase 6: User Story 5 - Favorites Screen Two-Tab Consolidation (Priority: P2)

**Goal**: Customer sees a consolidated two-tab Favorites screen (`[ متاجر | منتجات ]`) where all favorited stores appear under "متاجر" with department badges.

**Independent Test**: Navigate to `/favorites`, verify tabs are "متاجر" and "منتجات", verify all favorited stores appear regardless of department, and confirm department badge displays on each store card.

- [X] T018 [P] [US5] Add department badge to `src/features/restaurants/presentation/StoreCard.tsx` and `src/features/favorites/presentation/FavoriteStoreCard.tsx` displaying the department name
- [X] T019 [US5] Update `src/app/(customer)/favorites/index.tsx` to consolidate tabs into `[ متاجر | منتجات ]`, removing legacy `store.type === 'restaurant'` split and listing all favorited stores in active area

**Checkpoint**: Favorites screen is consolidated into two clean tabs with department badges.

---

## Phase 7: User Story 4 - Admin Customization Verification & Edge Cases (Priority: P3)

**Goal**: Verify that department changes made directly in Supabase (inserting, reordering, deactivating) reflect on the mobile app upon refresh without app updates, and edge cases behave gracefully.

**Independent Test**: Add/deactivate a department in Supabase, refresh mobile app, and verify grid updates immediately; verify broken image URLs render fallback placeholders.

- [X] T020 [US4] Verify dynamic catalog updates and edge cases: deactivating a department in Supabase hides it on mobile pull-to-refresh without app update, and verify fallback placeholders for broken/null `image_url` in `DepartmentTile`

**Checkpoint**: Complete end-to-end admin configurability verified without mobile app code changes.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Type safety, linting, and end-to-end scenario validation.

- [X] T021 [P] Run TypeScript typecheck (`npx tsc --noEmit`) to verify zero type errors across the entire codebase
- [X] T022 [P] Run linter (`npm run lint`) across modified files to ensure code quality and style compliance
- [X] T023 Execute all 5 verification scenarios in `specs/014-dynamic-home-categories/quickstart.md` and confirm all acceptance criteria pass

---

## Dependencies & Execution Order

### Phase Dependencies

```mermaid
graph TD
    Phase1[Phase 1: Setup & Migration] --> Phase2[Phase 2: Foundational Architecture]
    Phase2 --> Phase3[Phase 3: US1 - Home Categories Grid (MVP)]
    Phase2 --> Phase5[Phase 5: US3 - Category-Filtered Browse]
    Phase3 --> Phase4[Phase 4: US2 - View All Screen]
    Phase2 --> Phase6[Phase 6: US5 - Favorites Two-Tab Consolidation]
    Phase3 --> Phase7[Phase 7: US4 - Admin Customization Verification]
    Phase4 --> Phase8[Phase 8: Polish & Validation]
    Phase5 --> Phase8
    Phase6 --> Phase8
    Phase7 --> Phase8
```

### Parallel Opportunities

- **Phase 1**: T003 can run in parallel with T002 after migration schema is drafted.
- **Phase 2**: T004, T005, T008 can be created in parallel (pure domain entities/interfaces).
- **Phase 3 & Phase 6**: Once Phase 2 is complete, US1 (Home Grid) and US5 (Favorites) can be worked on in parallel.
- **Phase 8**: T021 (tsc) and T022 (lint) can run in parallel.

---

## Implementation Strategy

### MVP First (Phases 1, 2, & 3)
1. Complete Phase 1 (Migration & Types)
2. Complete Phase 2 (Foundational Domain & Repository)
3. Complete Phase 3 (Home Screen Grid)
4. **VALIDATE MVP**: Home screen displays dynamic categories grid from database.

### Incremental Delivery
1. Foundation & MVP Grid (Phases 1–3) → Home grid live.
2. Filtered Browse & View All (Phases 4–5) → Full exploration and store browsing live.
3. Favorites Consolidation (Phase 6) → Cleaned up 2-tab favorites.
4. Edge cases & Polish (Phases 7–8) → Production-ready release.
