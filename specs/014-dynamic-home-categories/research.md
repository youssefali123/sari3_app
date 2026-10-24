# Research & Architecture Decisions: Dynamic Customizable Home Categories Grid

**Feature**: `014-dynamic-home-categories`
**Date**: 2026-10-23
**Status**: Completed

## 1. Database Schema & Architecture

### Decision 1: Dedicated `departments` Table vs Overloading `categories`
- **Decision**: Create a dedicated `departments` table for top-level business verticals, keeping `categories` exclusively for store cuisine/sub-category tags.
- **Rationale**:
  - Eliminates semantic confusion between a store's primary business vertical (e.g., Pharmacy, Supermarket, Restaurant) and cuisine/tag sub-categories (e.g., Grills, Pizza, Dairy).
  - Keeps RLS policies and querying simple, high-performing, and partitionable.
  - Directly matches the requirements of a future web admin dashboard to manage business verticals independently of product/cuisine tags.
- **Alternatives Considered**:
  - *Adding `is_vertical` flag to `categories`*: Simpler schema change, but creates bloated table where parent-level departments share the same model as item-level cuisines, risking queries mixing them up.
  - *Extending Postgres enum `store_type`*: Rigid and requires DDL migrations (`ALTER TYPE ... ADD VALUE`) every time an admin adds a new category from the future web dashboard.

### Decision 2: Store Association via `department_id` Foreign Key
- **Decision**: Add `department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL` directly on `public.restaurants`.
- **Rationale**:
  - In delivery platforms (Talabat, Deliveroo, HungerStation), each merchant belongs to a single primary operational department.
  - Direct foreign key allows lightning-fast indexed queries: `SELECT * FROM restaurants WHERE department_id = $1 AND area_id = $2`.
  - Simple 1-to-many relationship simplifies web admin management (a single dropdown on store creation).
- **Alternatives Considered**:
  - *Many-to-many junction table (`restaurant_departments`)*: Added query overhead (joins), indexing complexity, and over-engineering when merchants belong to one primary vertical.

### Decision 3: Sub-Categories Scoping per Department
- **Decision**: Add `department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL` to `public.categories`.
- **Rationale**:
  - Allows each department to define its own sub-categories (e.g. Restaurants has Grills/Burgers, Supermarket has Dairy/Beverages, Pharmacy has Skincare/Medicine).
  - `CuisineCarousel` on the browse screen can filter sub-categories where `department_id = $selectedDepartmentId`.
  - Fully backward compatible: existing cuisine rows can link to the "مطاعم" department.

### Decision 4: Zero-Downtime Automatic Migration Backfill
- **Decision**: In the migration script, seed the 6 core departments with deterministic UUIDs and immediately run `UPDATE public.restaurants SET department_id = ...` matching `type = 'restaurant'` to "مطاعم" and `type = 'market'` to "سوبرماركت".
- **Rationale**:
  - Ensures existing stores continue appearing immediately in the mobile app without any data disappearance or manual intervention.

---

## 2. Frontend Architecture & State Management

### Decision 5: Clean Architecture Structure (`src/features/departments/`)
- **Decision**: Implement a dedicated feature module `src/features/departments/` following Sari3 Constitution Principles I, II, and III.
- **Directory Layout**:
  - `domain/entities/Department.ts`
  - `domain/repositories/DepartmentRepository.ts`
  - `infrastructure/SupabaseDepartmentRepository.ts`
  - `application/hooks/useDepartments.ts`
  - `presentation/components/DepartmentTile.tsx`
  - `presentation/components/HomeDepartmentsGrid.tsx`
- **Rationale**:
  - Adheres strictly to Principle I (Feature-first screaming architecture) and Principle II (Clean architecture with pure domain interfaces).
  - Keeps presentation decoupled from Supabase query implementations.

### Decision 6: State Management & Caching
- **Decision**: Use TanStack Query (`useQuery`) with queryKey `['departments', 'active']`.
- **Rationale**:
  - Adheres to Principle IV (State ownership is never duplicated: TanStack Query owns all server state).
  - Stale-while-revalidate caching allows the home screen to render cached departments in <100ms on subsequent visits, refreshing in the background.

### Decision 7: "View All" Screen Route (`/(customer)/(home)/departments`)
- **Decision**: Dedicated full-screen route (`src/app/(customer)/(home)/departments.tsx`) rather than a modal bottom sheet.
- **Rationale**:
  - Full screen provides maximum viewport space for a 3-column scrollable grid with 20+ departments.
  - Native header search bar handles mobile virtual keyboard transitions without bottom-sheet clipping or focus jumps.
  - Standard back button navigation integrates cleanly into Expo Router stack.

### Decision 8: Favorites Screen Tab Consolidation (`[ متاجر | منتجات ]`)
- **Decision**: Consolidate the 3 legacy tabs (`مطاعم`, `متاجر`, `منتجات`) into 2 tabs: `متاجر` (Stores) and `منتجات` (Products).
- **Rationale**:
  - Eliminates hardcoded dependency on `store.type === 'restaurant'` in Favorites.
  - Scales gracefully as new departments (Pharmacies, Bakeries, etc.) are added.
  - Enhanced with department badges on `StoreCard` so users easily distinguish store types.
