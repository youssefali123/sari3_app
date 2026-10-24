# Implementation Plan: Dynamic Customizable Home Categories Grid

**Branch**: `014-dynamic-home-categories` | **Date**: 2026-10-23 | **Spec**: [spec.md](file:///home/youssef/Documents/sari3_improve_ui/sari3-app3/specs/014-dynamic-home-categories/spec.md)

**Input**: Feature specification from `specs/014-dynamic-home-categories/spec.md`

## Summary

Replace the hardcoded two-tile section ("مطاعم" and "ماركت") on the customer home screen with a database-driven 3-column categories grid ("اطلب دلوقتي" / Order Now) powered by a dedicated `departments` table in Supabase. Customers can browse top departments on the home screen, explore all departments with real-time search on a dedicated full-screen view (`/departments`), filter stores by department in their selected operational area, and view consolidated store favorites in a streamlined two-tab layout (`[ متاجر | منتجات ]`).

Technical approach:
1. Database migration creating `departments` table with RLS and partial ordering index, adding `department_id` foreign key to `restaurants` and `categories`, seeding 6 core verticals, and automatically backfilling existing stores.
2. Dedicated `src/features/departments/` module adhering to Clean Architecture (domain entity/repository, Supabase infrastructure, TanStack Query hook, and responsive UI components).
3. New full-screen route `src/app/(customer)/(home)/departments.tsx` for "عرض الكل" with instant search.
4. Updated `browse.tsx` to filter stores by `departmentId` and display department-scoped sub-categories.
5. Consolidated `favorites/index.tsx` into two tabs (`[ متاجر | منتجات ]`) with department badges on store cards.

---

## Technical Context

**Language/Version**: TypeScript 5.9 (Strict mode), React 19, React Native 0.81
**Primary Dependencies**: Expo SDK 57, Expo Router v57, TanStack Query v5, Supabase JS, Expo Image, Lucide React Native
**Storage**: PostgreSQL (Supabase) — tables: `departments`, `restaurants`, `categories`
**Testing**: Unit & Component tests via Jest / RTL, end-to-end verification via Quickstart scenarios
**Target Platform**: Android, iOS, Web (Expo cross-platform)
**Project Type**: Mobile Application (React Native with Expo Router)
**Performance Goals**: <100ms cached render of home categories, <500ms navigation to filtered browse screen, smooth 60fps tile press animation
**Constraints**: Arabic RTL-first layout, Stale-while-revalidate server caching, zero downtime / no missing stores during migration
**Scale/Scope**: 6 seeded departments initially, architecture supports 50+ departments without code changes

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Compliance Details |
|-----------|--------|-------------------|
| **I. Feature-First Structure** | **PASS** | New capability organized under `src/features/departments/`, keeping business intent obvious. |
| **II. Lightweight Clean Architecture** | **PASS** | Separated into Domain (`Department`, `DepartmentRepository`), Infrastructure (`SupabaseDepartmentRepository`), Application (`useDepartments`), and Presentation (`DepartmentTile`, `HomeDepartmentsGrid`). Pure domain layer has 0 external dependencies. |
| **III. Fixed Dependency Direction** | **PASS** | Presentation → Application → Domain ← Infrastructure strictly respected. |
| **IV. State Ownership Is Never Duplicated** | **PASS** | TanStack Query (`['departments', 'active']`) owns all server state. No Redux mirroring. |
| **V. Server Authority** | **PASS** | Supabase RLS policy `departments_public_read` enforced on database level (`is_active = true`). |
| **VI. Atomic Writes** | **PASS** | Read-only feature on mobile client; schema migration performs atomic backfill of existing store foreign keys. |
| **VII. Historical Records** | **PASS** | No modifications to past orders; order item snapshots remain immutable. |
| **IX. Deferred Scope** | **PASS** | Web admin dashboard capability fully supported via database structure without future mobile rewrites. |
| **X. Practical Simplicity** | **PASS** | Direct foreign key `department_id` on `restaurants`, clean dedicated table, no premature abstractions or DI containers. |

---

## Project Structure

### Documentation (this feature)

```text
specs/014-dynamic-home-categories/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 architectural decisions & findings
├── data-model.md        # Phase 1 data entities, relationships & seed data
├── quickstart.md        # Phase 1 step-by-step verification guide
├── contracts/           # Phase 1 contracts
│   ├── database-contracts.md
│   └── repository-contracts.ts
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20261024000001_dynamic_departments.sql     # Table, indexes, RLS, seed & backfill

src/
├── features/
│   ├── departments/                           # Clean Architecture feature module
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── Department.ts
│   │   │   └── repositories/
│   │   │       └── DepartmentRepository.ts
│   │   ├── infrastructure/
│   │   │   └── SupabaseDepartmentRepository.ts
│   │   ├── application/
│   │   │   └── hooks/
│   │   │       └── useDepartments.ts
│   │   └── presentation/
│   │       └── components/
│   │           ├── DepartmentTile.tsx
│   │           └── HomeDepartmentsGrid.tsx
│   ├── restaurants/
│   │   ├── domain/entities/Store.ts           # Extended with departmentId/departmentName
│   │   ├── infrastructure/
│   │   │   └── SupabaseStoreRepository.ts     # Support department filtering in getStores
│   │   └── presentation/
│   │       └── StoreCard.tsx                  # Display department badge on store card
│   └── favorites/
│       └── presentation/
│           └── FavoriteStoreCard.tsx          # Display department badge
│
└── app/
    └── (customer)/
        ├── (home)/
        │   ├── index.tsx                      # Integrate HomeDepartmentsGrid in place of static tiles
        │   ├── departments.tsx                # New: View All full-screen route with search
        │   └── browse.tsx                     # Support departmentId param & department sub-categories
        └── favorites/
            └── index.tsx                      # Two-tab consolidation: [ متاجر | منتجات ]
```

**Structure Decision**: Clean Feature-First layout creating `src/features/departments/` while extending existing catalog infrastructure (`restaurants`, `browse`, `favorites`) with backward-compatible additions.

---

## Complexity Tracking

> **No constitutional violations. Table left blank.**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | *N/A* | *N/A* |
