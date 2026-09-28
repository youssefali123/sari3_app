# Tasks: Unified Catalog Search (008)

**Feature**: `008-catalog-search`
**Date**: 2026-09-27
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize directory layout and feature structure.

- [x] T001 Create directory structure for search feature in `src/features/search/domain/entities`, `src/features/search/domain/repositories`, `src/features/search/application/hooks`, `src/features/search/infrastructure`, and `src/features/search/presentation`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database extension, indexes, RPC function, and domain abstractions that MUST be completed before any user story UI can be wired up.

**⚠️ CRITICAL**: No user story presentation work can begin until this phase is complete.

- [x] T002 Write database migration for `pg_trgm` extension (`CREATE EXTENSION IF NOT EXISTS pg_trgm`), GIN trigram indexes (`idx_restaurants_name_trgm` and `idx_products_name_trgm`), and `search_catalog(p_area_id UUID, p_query TEXT)` RPC function in `supabase/migrations/20260927000001_catalog_search.sql`
- [x] T003 [P] Define `SearchResult`, `StoreResult`, and `ProductResult` discriminated union entities with strict type contracts (`result_type: 'store' | 'product'`) in `src/features/search/domain/entities/SearchResult.ts`
- [x] T004 [P] Define `SearchRepository` interface with `search(areaId: string, query: string): Promise<SearchResult[]>` in `src/features/search/domain/repositories/SearchRepository.ts`
- [x] T005 Implement `SupabaseSearchRepository` calling `supabase.rpc('search_catalog', { p_area_id, p_query })` and mapping RPC result rows to domain `SearchResult` items in `src/features/search/infrastructure/SupabaseSearchRepository.ts`

**Checkpoint**: Foundation ready — database search RPC is callable and domain repository is complete. User story implementation can begin.

---

## Phase 3: User Story 1 - Unified Store + Product Search (Priority: P1) 🎯 MVP

**Goal**: Customer (or guest) with an area selected can type 2+ characters and see a single ranked list combining matching stores and products from that area.

**Independent Test**: Select area "Fayoum", type 2+ characters in the search box on the Home screen, and verify that both store results and product results appear together ordered by similarity score.

- [x] T006 [P] [US1] Create `SearchEmptyState` component for zero search matches following app theme patterns in `src/features/search/presentation/SearchEmptyState.tsx`
- [x] T007 [P] [US1] Create `SearchBar` input component with search icon, clear button, and controlled input handling in `src/features/search/presentation/SearchBar.tsx`
- [x] T008 [US1] Implement `useSearch` hook with 300ms debounce, minimum 2-character query guard, and TanStack Query integration under queryKey `['search', 'catalog', selectedAreaId, debouncedQuery]` in `src/features/search/application/hooks/useSearch.ts`
- [x] T009 [P] [US1] Implement `StoreResultRow` component rendering store image, name, rating, and open status in `src/features/search/presentation/StoreResultRow.tsx`
- [x] T010 [P] [US1] Implement `ProductResultRow` component rendering product image, name, and parent `storeName` in `src/features/search/presentation/ProductResultRow.tsx`
- [x] T011 [US1] Implement `SearchResultsList` container coordinating loading spinner, error message, empty state, and list rendering of `StoreResultRow` and `ProductResultRow` in `src/features/search/presentation/SearchResultsList.tsx`
- [x] T012 [US1] Integrate `SearchBar` and `SearchResultsList` into Home screen `FlatList` header and toggle between search results and standard store browse mode in `src/app/(customer)/(home)/index.tsx`

**Checkpoint**: User Story 1 is functional as a complete MVP increment. Stores and products appear in a unified list scoped to the customer's area.

---

## Phase 4: User Story 2 - Guest (Unauthenticated) Search & No-Area State (Priority: P2)

**Goal**: Allow unauthenticated guests to search without being prompted to log in, and ensure consistent no-area handling when no area has been selected.

**Independent Test**: Use the app as an unauthenticated guest. With an area selected, search returns results without auth modals or 401 errors. Without an area selected, search displays the existing `AreaEmptyState` prompt and makes zero network calls.

- [x] T013 [US2] Update `useSearch` hook to verify guest execution without auth requirement and enforce idle state (returning `isIdle: true` and skipping RPC call) when `selectedAreaId === null` in `src/features/search/application/hooks/useSearch.ts`
- [x] T014 [US2] Update Home screen search container to render `AreaEmptyState` prompt when user interacts with search before selecting an area in `src/app/(customer)/(home)/index.tsx`

**Checkpoint**: Guest browsing confirmed friction-free; no-area state handled consistently without orphaned queries.

---

## Phase 5: User Story 3 - Product & Store Result Navigation (Priority: P2)

**Goal**: Tapping a product result navigates directly to `/product/[id]` (the dedicated product detail screen), and tapping a store result navigates to `/(customer)/(home)/store/[id]`.

**Independent Test**: Search for a product, tap the result, and verify it navigates to `src/app/product/[id].tsx`. Search for a store, tap the result, and verify it navigates to the store detail route.

- [x] T015 [P] [US3] Wire product search result press handler in `ProductResultRow` to navigate to `/product/[id]` via `router.push` in `src/features/search/presentation/ProductResultRow.tsx`
- [x] T016 [P] [US3] Wire store search result press handler in `StoreResultRow` to navigate to `/(customer)/(home)/store/[id]` via `router.push` in `src/features/search/presentation/StoreResultRow.tsx`

**Checkpoint**: Both result types route to their canonical screens without modals or incorrect redirects.

---

## Phase 6: User Story 4 - Closed-Store Results (Priority: P3)

**Goal**: Closed stores matching the search term appear in the results list (with a closed badge and disabled ordering), consistent with FR-024 catalog browsing.

**Independent Test**: Search for a known closed store in the selected area. Verify it appears in results, visually distinguished as closed, with click navigation still intact.

- [x] T017 [US4] Add closed status badge indicator to `StoreResultRow` styling when `isOpen === false` in `src/features/search/presentation/StoreResultRow.tsx`

**Checkpoint**: Closed store visibility matches browse catalog rules.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, linting, and final quality checks.

- [ ] T018 Run validation scenarios in `specs/008-catalog-search/quickstart.md`
- [x] T019 [P] Verify strict TypeScript compilation and lint cleanliness across `src/features/search/` and `src/app/(customer)/(home)/index.tsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. Blocks all User Story phases.
- **User Story 1 (Phase 3 - P1)**: Depends on Phase 2. Delivers the core search MVP.
- **User Story 2 (Phase 4 - P2)**: Depends on Phase 3 (`useSearch` and Home screen integration).
- **User Story 3 (Phase 5 - P2)**: Depends on Phase 3 (`ProductResultRow` and `StoreResultRow`).
- **User Story 4 (Phase 6 - P3)**: Depends on Phase 3 (`StoreResultRow`).
- **Polish (Phase 7)**: Depends on all user stories being completed.

### User Story Dependencies

```
Foundational (Phase 2)
        │
        ▼
   US1 (Phase 3) 🎯 MVP
   ┌────┼────┐
   ▼    ▼    ▼
  US2  US3  US4
   │    │    │
   └────┴────┘
        │
        ▼
 Polish (Phase 7)
```

- **US1 (P1)**: Core search pipeline — blocks US2, US3, US4.
- **US2 (P2)**: Guest access & empty area guard — can proceed immediately after US1.
- **US3 (P2)**: Result tap navigation — can proceed immediately after US1.
- **US4 (P3)**: Closed store UI indicator — can proceed in parallel with US2/US3.

---

## Parallel Opportunities

- **Phase 2 (Foundational)**:
  - T003 (`SearchResult.ts`) and T004 (`SearchRepository.ts`) can run in parallel while T002 (`catalog_search.sql`) is being authored.
- **Phase 3 (User Story 1)**:
  - T006 (`SearchEmptyState.tsx`), T007 (`SearchBar.tsx`), T009 (`StoreResultRow.tsx`), and T010 (`ProductResultRow.tsx`) can all be built in parallel.
- **Phase 5 (User Story 3)**:
  - T015 (`ProductResultRow` navigation) and T016 (`StoreResultRow` navigation) can be modified in parallel.

---

## Parallel Example: User Story 1 UI Components

```bash
# Launch UI components for User Story 1 in parallel:
Task: "T006 [P] [US1] Create SearchEmptyState component in src/features/search/presentation/SearchEmptyState.tsx"
Task: "T007 [P] [US1] Create SearchBar input component in src/features/search/presentation/SearchBar.tsx"
Task: "T009 [P] [US1] Implement StoreResultRow component in src/features/search/presentation/StoreResultRow.tsx"
Task: "T010 [P] [US1] Implement ProductResultRow component in src/features/search/presentation/ProductResultRow.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (`src/features/search/` directory structure)
2. Complete Phase 2: Foundational (migration with `pg_trgm`, GIN indexes, `search_catalog` RPC, domain entities, repository)
3. Complete Phase 3: User Story 1 (debounced hook, search bar, result rows, unified list, home screen integration)
4. **STOP and VALIDATE**: Verify search produces combined ranked results for stores and products in Fayoum.
5. Deploy/demo the core search MVP.

### Incremental Delivery

1. Foundation ready (Setup + DB migration + domain contracts).
2. Deliver US1 → MVP working (unified search on Home screen).
3. Deliver US2 → Guest access verified & no-area empty state integrated.
4. Deliver US3 → Direct navigation to `product/[id]` and store detail active.
5. Deliver US4 → Closed store badges reflected in search results.
6. Polish & validate against `quickstart.md`.
