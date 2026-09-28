# Tasks: Regional Order Dispatch & Store Browsing

**Feature**: `006-regional-order-dispatch`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, directory structure creation, and shared typing configuration.

- [x] T001 Create feature directory structure for areas capability in `src/features/areas/` with `domain/entities/`, `domain/repositories/`, `application/hooks/`, `infrastructure/`, and `presentation/` subdirectories
- [x] T002 [P] Update Supabase database type definitions in `src/shared/types/supabase.ts` adding `areas` table row type (`id`, `name`, `parent_area_id`, `created_at`), `driver_areas` table row type (`driver_id`, `area_id`, `created_at`), extending `RestaurantsRow` with `area_id: string`, and extending `ProfilesRow` with `selected_area_id: string | null`
- [x] T003 Mount `areaSlice` into the Redux store reducer map in `src/shared/lib/store.ts` under key `area`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema migration, RLS policies, seed data backfill, and domain entity/repository contracts that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Write unified database migration in `supabase/migrations/20260926000001_regional_order_dispatch.sql` creating `public.areas` (`id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `name TEXT NOT NULL`, `parent_area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`) with index `idx_areas_parent_area_id`
- [x] T005 Add RLS policy `areas_public_select` on `public.areas` in `supabase/migrations/20260926000001_regional_order_dispatch.sql` allowing `SELECT TO anon, authenticated USING (true)` with zero client write policies
- [x] T006 Seed initial reference areas in `supabase/migrations/20260926000001_regional_order_dispatch.sql` (`Fayoum` id `'20000000-0000-0000-0000-000000000001'`, `Senours` id `'20000000-0000-0000-0000-000000000002'` with parent Fayoum, `Itsa` id `'20000000-0000-0000-0000-000000000003'` with parent Fayoum)
- [x] T007 Add `area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT` to `public.restaurants`, backfill all existing rows (`SET area_id = '20000000-0000-0000-0000-000000000001' WHERE area_id IS NULL`), enforce `ALTER COLUMN area_id SET NOT NULL`, and add index `idx_restaurants_area_id` in `supabase/migrations/20260926000001_regional_order_dispatch.sql`
- [x] T008 Create `public.driver_areas` table in `supabase/migrations/20260926000001_regional_order_dispatch.sql` with `driver_id UUID NOT NULL REFERENCES public.driver_profiles(user_id) ON DELETE CASCADE`, `area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, composite primary key `(driver_id, area_id)`, and indexes on `area_id` and `driver_id`
- [x] T009 Add RLS policy `driver_areas_driver_select` on `public.driver_areas` in `supabase/migrations/20260926000001_regional_order_dispatch.sql` allowing `SELECT TO authenticated USING (driver_id = auth.uid())` with zero client write policies
- [x] T010 Seed test driver assignments linking existing driver accounts (`role = 'driver'` in `profiles`) to the Fayoum seed area in `supabase/migrations/20260926000001_regional_order_dispatch.sql`
- [x] T011 Add `selected_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL` with index `idx_profiles_selected_area_id` to `public.profiles` in `supabase/migrations/20260926000001_regional_order_dispatch.sql`
- [x] T012 Replace `public.get_available_orders()` in `supabase/migrations/20260926000001_regional_order_dispatch.sql` adding `AND EXISTS (SELECT 1 FROM public.driver_areas da WHERE da.driver_id = auth.uid() AND da.area_id = r.area_id)` while preserving all existing pending, unexpired, unassigned, active delivery guard, and decline filter conditions
- [x] T013 [P] Create pure TypeScript `Area` domain entity in `src/features/areas/domain/entities/Area.ts` with fields `id: string`, `name: string`, `parentAreaId: string | null`, and `createdAt: string`
- [x] T014 [P] Create `AreaRepository` domain interface in `src/features/areas/domain/repositories/AreaRepository.ts` declaring `getAreas(): Promise<Area[]>`
- [x] T015 Implement `SupabaseAreaRepository` in `src/features/areas/infrastructure/SupabaseAreaRepository.ts` querying `public.areas` ordered by `name` with row mapping to `Area` entity
- [x] T016 [P] Update `Store` domain entity in `src/features/restaurants/domain/entities/Store.ts` adding mandatory `areaId: string` field
- [x] T017 Update `StoreRepository` interface in `src/features/restaurants/domain/repositories/StoreRepository.ts` updating signature to `getStores(type?: StoreType, areaId?: string): Promise<Store[]>`
- [x] T018 Update `SupabaseStoreRepository` in `src/features/restaurants/infrastructure/SupabaseStoreRepository.ts` mapping `area_id` to `areaId` and adding `.eq('area_id', areaId)` filter condition when `areaId` parameter is provided
- [x] T019 [P] Update `UserProfile` domain entity in `src/features/profile/domain/entities/UserProfile.ts` adding `selectedAreaId: string | null`
- [x] T020 Update `ProfileRepository` interface and `UpdateProfileInput` in `src/features/profile/domain/repositories/ProfileRepository.ts` adding optional `selectedAreaId?: string | null`
- [x] T021 Update `SupabaseProfileRepository` in `src/features/profile/infrastructure/SupabaseProfileRepository.ts` mapping `selected_area_id` to `selectedAreaId` in `getProfile` and handling `selectedAreaId` update payload in `updateProfile`

**Checkpoint**: Core database migrations, domain models, and repository interfaces ready. Feature implementation can now begin.

---

## Phase 3: User Story 1 - Customer Area Drill-Down Selection & Store Filtering (Priority: P1) 🎯 MVP

**Goal**: Customer can browse stores scoped to an exact area using a drill-down picker (Fayoum → Senours or Fayoum only), with stores re-filtering immediately upon area change.

**Independent Test**: Open the customer home screen, tap the area selector chip, select "Fayoum", and verify only Fayoum stores appear. Then drill into "Senours" and verify only Senours stores appear.

### Implementation for User Story 1

- [x] T022 [P] [US1] Create TanStack Query hook `useAreas` in `src/features/areas/application/hooks/useAreas.ts` calling `AreaRepository.getAreas()` with helper functions `topLevelAreas` and `getChildAreas(parentId: string)`
- [x] T023 [P] [US1] Create `AreaHeaderChip` presentation component in `src/features/areas/presentation/AreaHeaderChip.tsx` displaying the active area name with a location icon and an onPress handler
- [x] T024 [US1] Create `AreaPickerModal` drill-down modal component in `src/features/areas/presentation/AreaPickerModal.tsx` supporting two-step drill-down: listing top-level governorates/cities, listing sub-areas on tap, offering a "[Parent] only" option, and returning the chosen exact `area_id`
- [x] T025 [P] [US1] Create dedicated `AreaEmptyState` component in `src/features/areas/presentation/AreaEmptyState.tsx` displaying "No stores found in this area yet" with location emoji and area switch prompt
- [x] T026 [US1] Integrate `AreaHeaderChip`, `AreaPickerModal`, and `AreaEmptyState` into `src/app/(customer)/(home)/index.tsx`, passing `selectedAreaId` to `storeRepository.getStores(typeFilter, selectedAreaId)` and updating TanStack Query key to `['stores', 'home', selectedAreaId, typeFilter]`

**Checkpoint**: User Story 1 complete. Customer can browse stores scoped to any selected area via drill-down selection with exact-match filtering.

---

## Phase 4: User Story 2 - Area Selection Client State & Profile Persistence (Priority: P1)

**Goal**: Seamless state management where unauthenticated guests can select an area via Redux, authenticated customers have their choice persisted to `profiles.selected_area_id`, and guest selections auto-migrate on login.

**Independent Test**: Select an area as a guest; verify store listing re-filters without login prompt. Log into an existing customer account; verify the chosen area is saved to the profile database record and restored upon fresh login.

### Implementation for User Story 2

- [x] T027 [US2] Implement `areaSlice` in `src/features/areas/application/areaSlice.ts` defining `AreaState` (`selectedAreaId: string | null`, `selectedAreaName: string | null`), reducers `setArea(state, action: PayloadAction<{ id: string; name: string }>)`, and `clearArea(state)`
- [x] T028 [US2] Implement `useSelectedArea` hook in `src/features/areas/application/hooks/useSelectedArea.ts` reading active area from Redux `useAppSelector`, dispatching `setArea` to Redux, persisting to `ProfileRepository.updateProfile({ selectedAreaId })` when authenticated, and auto-syncing profile `selected_area_id` on login

**Checkpoint**: User Stories 1 and 2 complete. Guests and authenticated customers experience persistent, synchronized area selection.

---

## Phase 5: User Story 3 - Driver Area-Scoped Available Orders Pool & Regional Push Alerts (Priority: P1)

**Goal**: Drivers view pending available orders originating exclusively from restaurants in their explicitly assigned areas (strict non-inheritance), and the serverless Edge Function sends push alerts only to drivers in that area.

**Independent Test**: Assign Driver A to Fayoum only and Driver B to Senours only. Create pending orders in both areas. Verify Driver A sees only the Fayoum order and Driver B sees only the Senours order. Inspect `notify-order-status` execution logs to confirm push notifications are scoped strictly to the order's area.

### Implementation for User Story 3

- [x] T029 [US3] Verify and ensure driver available orders pool hook in `src/features/drivers/application/hooks/useAvailableOrders.ts` refetches on `driver_pool_signals` events and screen focus, querying `get_available_orders()` without client-side area tampering
- [x] T030 [US3] Update Edge Function `supabase/functions/notify-order-status/index.ts` in driver notification step (4b) to query `restaurant.area_id` from `public.restaurants`, query `driver_areas` where `area_id = restaurant.area_id`, and intersect assigned drivers with the available, unbusy drivers list before dispatching push notifications

**Checkpoint**: User Story 3 complete. Driver order pool and push notifications are strictly bounded to assigned regions.

---

## Phase 6: User Story 4 - Safe-Default-Deny Pool Enforcement for Drivers Without Areas (Priority: P1)

**Goal**: Newly provisioned or unassigned drivers receive an empty pool (`[]`) on the server and see an informative empty state informing them that no delivery zones are assigned.

**Independent Test**: Log in with a driver account having zero rows in `driver_areas`. Navigate to Available Orders. Verify server returns `[]` and UI displays "No delivery areas assigned: contact support to set up your delivery zones".

### Implementation for User Story 4

- [x] T031 [P] [US4] Create `useDriverAreas` hook in `src/features/drivers/application/hooks/useDriverAreas.ts` querying `public.driver_areas` for the authenticated driver (`driver_id = auth.uid()`) using TanStack Query key `['driver', 'assignedAreas']`
- [x] T032 [US4] Update driver available orders screen in `src/app/(driver)/available-orders/index.tsx` to inspect `driverAreas`: if `driverAreas.length === 0`, display a prominent empty state card with message "No delivery areas assigned: contact dispatch or support to set up your delivery zones"

**Checkpoint**: User Story 4 complete. Unassigned drivers are safely denied access to order pools and guided with clear messaging.

---

## Phase 7: User Story 5 - Database RLS and Tamper-Proof Security (Priority: P2)

**Goal**: Guarantee that non-admin clients cannot mutate area reference data, alter store area assignments, or modify driver area assignments.

**Independent Test**: Execute unauthorized `INSERT`/`UPDATE`/`DELETE` queries on `areas`, `driver_areas`, and `restaurants.area_id` using anonymous and authenticated customer/driver JWTs and verify rejection by RLS.

### Implementation for User Story 5

- [x] T033 [US5] Verify RLS enforcement in `supabase/migrations/20260926000001_regional_order_dispatch.sql` ensuring that neither `areas` nor `driver_areas` has `INSERT`, `UPDATE`, or `DELETE` policies for `anon` or `authenticated` roles
- [x] T034 [US5] Verify that existing `restaurants_update` policy or absence thereof strictly prevents customer and driver clients from updating `restaurants.area_id` directly

**Checkpoint**: User Story 5 complete. Row Level Security guarantees tamper-proof regional configuration.

---

## Phase 8: User Story 6 - Existing Catalog Backfill and Migration Integrity (Priority: P2)

**Goal**: Ensure all existing seeded restaurants and test drivers have valid area assignments post-migration so no stores vanish and test pools remain operational.

**Independent Test**: Run the database migration and verify via SQL queries that 0 restaurants have `area_id IS NULL`, test driver accounts are assigned to Fayoum in `driver_areas`, and all seed stores appear in the Fayoum catalog.

### Implementation for User Story 6

- [x] T035 [US6] Validate database migration script `supabase/migrations/20260926000001_regional_order_dispatch.sql` backfill logic: confirms all existing restaurant rows are populated with the Fayoum area ID before `NOT NULL` constraint is applied
- [x] T036 [US6] Validate test driver assignment seeding in `supabase/migrations/20260926000001_regional_order_dispatch.sql`: confirms `driver_areas` rows are inserted for existing test driver profiles (`driver@sari3.test`, `test-driver`, `test-driver2`)

**Checkpoint**: User Story 6 complete. Existing catalog data and test driver accounts seamlessly transition post-migration.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Type safety verification, lint compliance, and end-to-end scenario validation.

- [x] T037 [P] Run TypeScript strict type verification via `npx tsc --noEmit` and resolve any type mismatches in area, restaurant, profile, or driver features
- [x] T038 [P] Run Expo linter via `npm run lint` and ensure strict linting compliance across all modified and newly created files
- [ ] T039 Execute all 7 end-to-end validation scenarios documented in `specs/006-regional-order-dispatch/quickstart.md` (drill-down browsing, guest persistence, driver pool scoping, safe-default-deny, push alerts, RLS security, and backfill verification)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion. Can start immediately after Phase 2 (MVP).
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion. Integrates with User Story 1 UI components.
- **User Story 3 (Phase 5)**: Depends on Phase 2 completion. Independent of User Story 1 & 2.
- **User Story 4 (Phase 6)**: Depends on Phase 2 completion. Independent of User Story 1 & 2.
- **User Story 5 (Phase 7)**: Depends on Phase 2 migration completion.
- **User Story 6 (Phase 8)**: Depends on Phase 2 migration completion.
- **Polish (Phase 9)**: Depends on all user stories being implemented.

### User Story Dependencies

- **US1 (Customer Browsing)**: Independent after Foundational.
- **US2 (Guest/Profile State)**: Extends US1 with Redux persistence and Profile synchronization.
- **US3 (Driver Pool & Alerts)**: Independent after Foundational; focuses on driver dispatch and Edge Function.
- **US4 (Safe-Default-Deny)**: Independent after Foundational; focuses on driver empty state.
- **US5 & US6 (Security & Backfill)**: Verified directly through migration and integration checks.

---

## Parallel Execution Opportunities

### Phase 1 (Setup)
- `T002` (Supabase types) can run in parallel with `T001` (directory structure).

### Phase 2 (Foundational)
- `T013` (Area entity), `T014` (AreaRepository), `T016` (Store entity), and `T019` (UserProfile entity) can all be authored in parallel once `T002` is complete.

### Phase 3 (User Story 1)
- `T022` (`useAreas`), `T023` (`AreaHeaderChip`), and `T025` (`AreaEmptyState`) can be authored in parallel before assembling in `T024` and `T026`.

### Cross-Story Parallelism (After Foundational Phase 2)
- Developer A can implement Customer Browsing & State (`US1` + `US2`: T022–T028).
- Developer B can implement Driver Fulfillment & Push Alerts (`US3` + `US4`: T029–T032).

---

## Implementation Strategy

### MVP First (User Story 1 & Foundational)
1. Complete **Phase 1: Setup** (T001–T003)
2. Complete **Phase 2: Foundational** (T004–T021)
3. Complete **Phase 3: User Story 1** (T022–T026)
4. **STOP and VALIDATE**: Verify customer drill-down area selection and store catalog filtering. This forms a complete, independently shippable customer browsing MVP!

### Incremental Delivery
1. Foundation + US1 → Customer regional browsing functional (MVP).
2. Add US2 → Guest Redux state & profile persistence across sessions.
3. Add US3 & US4 → Driver pool regional filtering, safe-default-deny, and regional push notifications.
4. Add US5 & US6 → Security & backfill verification.
5. Polish (Phase 9) → Full lint, typecheck, and quickstart validation.
