# Implementation Plan: Regional Order Dispatch & Store Browsing

**Branch**: `006-regional-order-dispatch` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-regional-order-dispatch/spec.md`, requirements from `mds/regional-order-dispatch.md`, project structure, and project constitution (`.specify/memory/constitution.md` v1.1.0).

---

## Summary

Implement area-based store browsing for customers and regional order dispatch for drivers in the Sari3 delivery application:
1. **Adjacency-List Areas**: Represent geographic regions in `public.areas` with `parent_area_id` for UI drill-down navigation (e.g., "Fayoum" → "Senours" or "Fayoum only").
2. **Exact-Match Store Scoping**: Associate each store with one area (`restaurants.area_id` `NOT NULL`). Filter catalog browsing by exact `area_id` match with zero recursive or parent-inclusive rollups.
3. **Explicit Driver Coverage & Safe-Default-Deny**: Maintain many-to-many non-inheriting driver assignments in `public.driver_areas`. Extend `get_available_orders()` server-side to return only orders from restaurants in the driver's assigned areas; drivers with zero areas see an empty pool.
4. **Push Notification Scoping**: Extend the serverless Edge Function `notify-order-status` so that new order push alerts are sent exclusively to available drivers assigned to the order's restaurant `area_id`.
5. **Dual-Layer Customer State**: Redux Toolkit `areaSlice` holds client-local selection for friction-free guest browsing; `profiles.selected_area_id` persists preferences for authenticated customers and synchronizes upon login.
6. **Integrity & Backfill Migration**: Backfill all existing restaurants to a seed area (`Fayoum`) before enforcing `NOT NULL`, and seed test driver assignments to ensure continuous testability.

---

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode `strict: true`), React 19.2.3, React Native 0.86.3

**Primary Dependencies**:
- Expo SDK 57 (`~57.0.20`), Expo Router (`~57.0.19`)
- Supabase JS (`^2.116.0`) for database RPCs, Realtime channels, and authentication
- TanStack Query v5 (`^5.102.8`) for server state (`['areas']`, `['stores', 'home', areaId, typeFilter]`, `['driver', 'availableOrders']`)
- Redux Toolkit (`^2.12.0`) for client-local state (`areaSlice`, `cartSlice`)
- `@react-native-async-storage/async-storage` (`2.2.0`) for auth token persistence

**Storage Architecture**:
- **Supabase PostgreSQL**:
  - Tables: `public.areas` (new), `public.driver_areas` (new), `public.restaurants` (altered with `area_id`), `public.profiles` (altered with `selected_area_id`).
  - Stored Procedures (RPCs): Updated `public.get_available_orders()`.
  - Row Level Security: Public read on `areas`, driver read on own `driver_areas`, zero client mutation policies.
- **Edge Functions**:
  - `notify-order-status`: Updated to scope driver tokens to `driver_areas.area_id = order.restaurant.area_id`.
- **Client Cache & Stores**:
  - Redux: `area` slice (`selectedAreaId`, `selectedAreaName`).
  - TanStack Query: `['areas']`, `['stores', 'home', areaId, typeFilter]`, `['driver', 'availableOrders']`.

**Testing Strategy**:
- TypeScript strict verification (`npx tsc --noEmit`).
- Expo linting verification (`npm run lint`).
- Database migration execution and verification via scenarios in [`quickstart.md`](./quickstart.md).
- End-to-end manual validation across guest, customer, driver, and unassigned driver roles.

**Constraints & Performance Goals**:
- Area selection re-filtering in < 1.0s under normal network conditions (SC-006).
- 0% cross-region order leakage in driver pool queries (SC-002).
- 0% cross-region notification leakage in push alerts (SC-009).
- 100% safe-default-deny for drivers without assigned areas (SC-003).
- 0% client write access permitted to area configuration tables (SC-005).
- Zero GPS/geolocation tracking or distance radius calculations (Feature Constraint).

---

## Constitution Check

*GATE: Evaluated against Constitution v1.1.0 principles.*

| Principle | Requirement | Compliance Analysis | Status |
|---|---|---|---|
| **I. Feature-First Structure** | Root organized by business capability (`areas/`, `restaurants/`, `drivers/`, `cart/`). | New area domain, application, and presentation logic placed in `src/features/areas/`. Store catalog queries updated in `src/features/restaurants/`. Driver pool query updated in `src/features/drivers/`. | **PASS** |
| **II. Lightweight Clean Architecture** | Pure TS Domain, Application use cases/hooks, Infrastructure repositories, Presentation UI. | `Area` entity and `AreaRepository` interface are pure TS. Supabase calls isolated in `SupabaseAreaRepository`. Presentation uses hooks. | **PASS** |
| **III. Dependency Direction** | Presentation → Application → Domain ← Infrastructure | `AreaRepository` defined in Domain; implemented in Infrastructure (`SupabaseAreaRepository`); consumed by Application hooks (`useAreas`, `useSelectedArea`) and Presentation (`AreaPickerModal`). | **PASS** |
| **IV. State Ownership** | TanStack Query owns server state; Redux owns client-local state only; Context owns auth session. | Reference areas and store catalog owned by TanStack Query. Customer's active selected area owned by Redux `areaSlice` (client UI preference, enabling guest browsing without auth), persisted to `profiles` on backend. | **PASS** |
| **V. Server Is Final Authority** | Roles, visibility, and filtering enforced at the database level. | Driver pool regional filtering and safe-default-deny are implemented inside `SECURITY DEFINER` function `get_available_orders()`. Direct client mutations to `areas` and `driver_areas` are blocked by RLS. | **PASS** |
| **VI. Atomic Concurrency Writes** | Concurrency-critical writes atomic at database level. | Migration executes atomically (table creation, backfill, NOT NULL constraint). Driver pool reads execute via single atomic query. | **PASS** |
| **VII. Historical Records Immutable** | Historical orders snapshot records at transaction time; no physical deletions. | Existing orders retain their historical addresses and store snapshots. Adding `area_id` to `restaurants` does not alter completed orders or order items. | **PASS** |
| **VIII. Realtime & Push Separate** | Realtime separate from push, hidden behind Domain services. | In-app pool updates remain driven by `driver_pool_signals` refetching `get_available_orders()`. Push alerts handled by `notify-order-status` Edge Function. | **PASS** |
| **IX. Deferred Scope Kept Open** | Excluded MVP features (GPS, admin UI) not precluded by design. | Simple `area_id` foreign keys and adjacency-list tables can be extended with polygons or geometry coordinates later without restructuring features. | **PASS** |
| **X. Practical MVP Simplicity** | Simplicity over theoretical purity; no unnecessary abstraction. | Exact matching on `area_id` avoids recursive CTEs. Plain junction table for driver areas avoids complex graph rules. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-regional-order-dispatch/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 decisions & alternatives
├── data-model.md        # Relational schema & entity models
├── quickstart.md        # Runnable verification guide
├── contracts/           # API, DB, RPC & Edge function contracts
│   ├── database-schema.md
│   ├── rpc-get-available-orders.md
│   ├── edge-function-notify-order-status.md
│   └── api-client-contracts.md
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code Layout

```text
src/
├── features/
│   ├── areas/                                # NEW: Area capability
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── Area.ts                   # Pure TS Area entity
│   │   │   └── repositories/
│   │   │       └── AreaRepository.ts         # Interface for area fetching
│   │   ├── infrastructure/
│   │   │   └── SupabaseAreaRepository.ts     # Supabase implementation of AreaRepository
│   │   ├── application/
│   │   │   ├── areaSlice.ts                  # Redux slice for client-local area selection
│   │   │   └── hooks/
│   │   │       ├── useAreas.ts               # TanStack Query hook for reference areas
│   │   │       └── useSelectedArea.ts        # Hook syncing Redux and Profile persistence
│   │   └── presentation/
│   │       ├── AreaPickerModal.tsx           # Drill-down hierarchical area picker
│   │       ├── AreaHeaderChip.tsx            # Header indicator button on HomeScreen
│   │       └── AreaEmptyState.tsx            # "No stores in this area" empty state
│   ├── restaurants/                          # UPDATED: Store catalog browsing
│   │   ├── domain/
│   │   │   ├── entities/Store.ts             # Adds areaId to Store entity
│   │   │   └── repositories/StoreRepository.ts # getStores(type?, areaId?)
│   │   └── infrastructure/
│   │       └── SupabaseStoreRepository.ts    # Adds area_id filter to store query
│   ├── profile/                              # UPDATED: Profile persistence
│   │   ├── domain/entities/UserProfile.ts    # Adds selectedAreaId to UserProfile
│   │   ├── domain/repositories/ProfileRepository.ts # Adds selectedAreaId to UpdateProfileInput
│   │   └── infrastructure/SupabaseProfileRepository.ts
│   └── drivers/                              # UPDATED: Driver pool UI & empty state
│       └── presentation/components/
│           └── AvailableOrderCard.tsx
├── shared/
│   ├── lib/
│   │   └── store.ts                          # Mounts areaSlice into Redux store
│   └── types/
│       └── supabase.ts                       # Database type definitions for areas, driver_areas
├── app/
│   ├── (customer)/
│   │   └── (home)/
│   │       └── index.tsx                     # Integrated with AreaHeaderChip & areaId filter
│   └── (driver)/
│       └── available-orders/
│           └── index.tsx                     # Updated with "No areas assigned" empty state
supabase/
├── migrations/
│   └── 20260926000001_regional_order_dispatch.sql # Migration: tables, seed, backfill, RLS, RPC
└── functions/
    └── notify-order-status/
        └── index.ts                          # Edge function: driver regional scoping
```

**Structure Decision**: A dedicated `src/features/areas/` capability folder is established per Principle I (Feature-First Structure). It keeps the area reference models and UI components modular, clean, and isolated from restaurant and order details, while consumer features (`restaurants`, `profile`, `drivers`) consume it via defined contracts.

---

## Complexity Tracking

*No constitutional violations identified. No exceptions requested.*
