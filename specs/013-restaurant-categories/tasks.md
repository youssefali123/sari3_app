# Implementation Tasks: Restaurant Cuisines & Visual Categories

**Feature Branch**: `013-restaurant-categories`  
**Date**: 2026-10-23  
**Spec**: [specs/013-restaurant-categories/spec.md](spec.md)  
**Plan**: [specs/013-restaurant-categories/plan.md](plan.md)  

---

## Phase 1: Setup & Foundational (Database & Migration)

**Purpose**: Establish the relational schema for categories with image support and many-to-many store associations.

**⚠️ CRITICAL**: Must be completed before UI and repository integration.

- [X] T001 Create Supabase migration `supabase/migrations/20261023000001_restaurant_categories.sql` defining `public.categories` (with `image_url`, `slug`, `icon_name`, `display_order`), `public.restaurant_categories` junction table, indexes, RLS policies, and legacy data migration.
- [X] T002 Apply migration `20261023000001_restaurant_categories.sql` to the active Supabase project.
- [X] T003 Validate database schema, columns, RLS read policies, and seeded categories.

---

## Phase 2: Domain & Infrastructure Layer

**Purpose**: Define pure domain entities and implement database access via `SupabaseStoreRepository`.

- [X] T004 [P] Create `CuisineCategory` pure domain entity in `src/features/restaurants/domain/entities/CuisineCategory.ts`.
- [X] T005 [P] Update `Store` entity in `src/features/restaurants/domain/entities/Store.ts` with optional `categories?: readonly CuisineCategory[]`.
- [X] T006 Update `StoreRepository` interface in `src/features/restaurants/domain/repositories/StoreRepository.ts` with `getCuisineCategories` and `getStoresByCuisineCategory`.
- [X] T007 Implement `getCuisineCategories` and `getStoresByCuisineCategory` in `src/features/restaurants/infrastructure/SupabaseStoreRepository.ts`.

---

## Phase 3: Application Hooks

**Purpose**: Provide reactive TanStack Query hooks for category loading and active filter state.

- [X] T008 Implement `useCuisineCategories` hook in `src/features/restaurants/application/hooks/useCuisineCategories.ts`.

---

## Phase 4: User Story 1 & 2 - Visual Categories Carousel & Home Screen Filtering (Priority: P1) 🎯 MVP

**Goal**: Deliver a horizontal carousel with visual category cards featuring images, title labels, and instant filtering on the Customer Home Screen.

**Independent Test**: Load the customer home screen, verify the categories carousel appears with images and titles. Tap any category; verify only matching restaurants are shown. Tap again or tap "الكل"; verify all restaurants return.

- [X] T009 [P] [US1] Create `CuisineTile` component in `src/features/restaurants/presentation/components/CuisineTile.tsx` using `expo-image`, system font typography, active highlight styling, and press feedback.
- [X] T010 [P] [US1] Create `CuisineCarousel` component in `src/features/restaurants/presentation/components/CuisineCarousel.tsx` with horizontal scrolling, "الكل" reset option, and loading skeleton states.
- [X] T011 [US1] Integrate `CuisineCarousel` into Customer Home Screen in `src/app/(customer)/(home)/index.tsx`, connecting active category selection to the restaurants query.

**Checkpoint**: User Stories 1 & 2 complete — customers can visually browse food categories with images and filter restaurants on the home screen.

---

## Phase 5: User Story 3 - Category Filtering on Dedicated Browse Screen (Priority: P2)

**Goal**: Enable cuisine category filtering on the dedicated restaurant browse screen (`browse.tsx`).

**Independent Test**: Navigate to `/browse?type=restaurant`, select a category chip; verify the list filters and restaurant count updates accordingly.

- [X] T012 [US3] Integrate category filter chips and filtered query logic into `src/app/(customer)/(home)/browse.tsx`.

---

## Phase 6: User Story 4 - Multi-Category Display on Cards & Details (Priority: P3)

**Goal**: Show all cuisines assigned to a restaurant in `StoreCard` and restaurant detail views.

**Independent Test**: View a restaurant associated with multiple categories; verify all category labels appear separated by bullets.

- [X] T013 [US4] Update `src/features/restaurants/presentation/StoreCard.tsx` to render multi-category tags when available.

---

## Phase 7: Polish & Verification

**Purpose**: Final validation, type-checking, and regression testing.

- [X] T014 Run static type check `npx tsc --noEmit` and ensure 0 errors.
- [X] T015 Run unit tests using `tsx --test`.
- [X] T016 Execute validation scenarios in `specs/013-restaurant-categories/quickstart.md`.
