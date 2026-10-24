# Implementation Plan: Restaurant Cuisines & Visual Categories

**Branch**: `013-restaurant-categories` | **Date**: 2026-10-23 | **Spec**: [specs/013-restaurant-categories/spec.md](spec.md)

**Input**: Feature specification from `specs/013-restaurant-categories/spec.md` for dedicated visual food categories, many-to-many store relationships, and instant category filtering on the customer home and browse screens.

---

## Summary

Implement dedicated visual cuisine categorization across mobile customer discovery:
- **Relational Schema & Migration**: Create `public.categories` (with `name`, `slug`, `image_url`, `icon_name`, `display_order`, `is_active`, `type`) and `public.restaurant_categories` junction table. Populate existing legacy text categories from `restaurants.category` into normalized relational data without breaking changes.
- **Clean Architecture Domain & Repo**: Define pure `CuisineCategory` entity and expand `StoreRepository` with `getCuisineCategories` and `getStoresByCuisineCategory`.
- **Application Hook**: Create `useCuisineCategories` hook leveraging TanStack Query with optimistic caching and active filter state.
- **Visual Presentation UI**: Build `CuisineCarousel` and `CuisineTile` with `expo-image` support, fallback icons, smooth active selection state, and seamless touch feedback.
- **Screen Integration**: Wire real-time category filtering into `src/app/(customer)/(home)/index.tsx` and `src/app/(customer)/(home)/browse.tsx`.

---

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.86 / React 19  
**Primary Dependencies**: React Native, Expo SDK 57, Expo Router (`~57.0.28`), `expo-image` (`~2.0.4`), `@tanstack/react-query` (`^5.102.8`)  
**Storage**: PostgreSQL 17 (Supabase) via `@supabase/supabase-js` (`^2.116.0`)  
**Testing**: `tsx --test` for domain/infrastructure parsing, static typecheck `tsc --noEmit`  
**Target Platform**: iOS and Android (Expo SDK 57)  
**Project Type**: Mobile Application (Clean Architecture + Expo Router)  
**Performance Goals**: Category carousel initial paint < 200ms; filter switch < 80ms  
**Constraints**: Pure domain entities without React Native/Supabase imports; zero raw unhandled errors  

---

## Constitution Check

| Principle | Requirement | Plan Alignment | Status |
|---|---|---|---|
| **I. Feature-First Structure** | Group by business capability | Categories & cuisine components live under `features/restaurants/` | **PASS** |
| **II. Lightweight Clean Architecture** | Domain & App free of framework imports | `CuisineCategory` entity is pure TypeScript; repository handles Supabase joins | **PASS** |
| **III. Fixed Dependency Direction** | UI → App → Domain ← Infra | Presentation imports hooks & types; Infra implements `StoreRepository` | **PASS** |
| **IV. State Ownership** | TanStack Query owns server state | Categories and filtered restaurant lists live in TanStack Query cache | **PASS** |
| **V. Server Authority** | Database enforces rules & integrity | Many-to-many foreign keys and cascade rules enforced at database level | **PASS** |
| **X. Practical Simplicity** | Avoid redundant abstractions | Reuses existing `StoreCard` and `StoreRepository` patterns | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/013-restaurant-categories/
├── spec.md                  # Requirements and user stories
├── plan.md                  # This implementation plan
├── research.md              # Architectural decisions (M:N schema, image strategy)
├── data-model.md            # PostgreSQL tables and TypeScript entities
├── quickstart.md            # Step-by-step verification scenarios
├── checklists/
│   └── requirements.md      # Spec quality checklist
└── contracts/               # Interface definitions
```

### Source Code Additions & Modifications

```text
supabase/migrations/
└── 20261023000001_restaurant_categories.sql         # New categories schema & data migration

src/features/restaurants/
├── domain/
│   ├── entities/
│   │   ├── CuisineCategory.ts                       # Pure domain entity
│   │   └── Store.ts                                 # Updated with optional categories array
│   └── repositories/
│       └── StoreRepository.ts                       # getCuisineCategories, getStoresByCuisineCategory
├── infrastructure/
│   └── SupabaseStoreRepository.ts                   # Implements queries via Supabase client
├── application/
│   └── hooks/
│       └── useCuisineCategories.ts                  # TanStack Query hook with active filter state
└── presentation/
    ├── components/
    │   ├── CuisineCarousel.tsx                      # Horizontal visual carousel with images
    │   └── CuisineTile.tsx                          # Individual visual category tile with expo-image
    └── StoreCard.tsx                                # Display multiple cuisine tags

src/app/(customer)/(home)/
├── index.tsx                                        # Integrate CuisineCarousel and active filter
└── browse.tsx                                       # Category filter chips bar
```

---

## Implementation Phases

1. **Phase 1: Database Migration & Seed**: Write migration `20261023000001_restaurant_categories.sql` in `supabase/migrations`, create tables, RLS policies, and seed default categories with images/icons.
2. **Phase 2: Domain & Infrastructure**: Create `CuisineCategory.ts`, update `StoreRepository.ts`, and implement `getCuisineCategories` & `getStoresByCuisineCategory` in `SupabaseStoreRepository.ts`.
3. **Phase 3: Application Hooks**: Create `useCuisineCategories.ts` with TanStack Query caching.
4. **Phase 4: Presentation Components**: Implement `CuisineTile.tsx` and `CuisineCarousel.tsx` with `expo-image`, system font styling, and fluid press interactions.
5. **Phase 5: Screen Integration**: Add `CuisineCarousel` into `src/app/(customer)/(home)/index.tsx` and category filtering in `src/app/(customer)/(home)/browse.tsx`.
6. **Phase 6: Verification & Quality**: Verify tests pass, `tsc --noEmit` is clean, and manual quickstart scenarios succeed.
