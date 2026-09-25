# Tasks: Driver Fulfillment

**Input**: Design documents from `specs/003-driver-fulfillment/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/
**Tests**: No automated test tasks are included — the feature specification does not explicitly request tests or a TDD approach. Verification is via the manual quickstart scenarios referenced in each checkpoint.
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Expo + TypeScript mobile app: `src/` at repository root, routes in `src/app/(driver)/`, feature code in `src/features/drivers/`, migrations in `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Install `expo-network` (`~7.0.5`) via `npx expo install expo-network` and verify it appears in `package.json`
- [x] T002 [P] Verify `DriverProfile` entity alignment with live `driver_profiles` table in `src/features/drivers/domain/entities/DriverProfile.ts` (`isAvailable` defaults to `false`, `currentOrderId` active-order pointer)
- [x] T003 [P] Verify live `claim_order(p_order_id, p_driver_id)` RPC behavior and trigger guards (`orders_column_guard`, `validate_order_transition`) via read-only Supabase inspection — no schema change

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create Migration 1 `supabase/migrations/20260920000001_driver_fulfillment_schema.sql` with table `public.driver_order_interactions` (`interaction_type TEXT NOT NULL CHECK (interaction_type IN ('declined', 'released'))`, `reason TEXT`, `CONSTRAINT doi_release_requires_reason CHECK (interaction_type != 'released' OR (reason IS NOT NULL AND TRIM(reason) != ''))`), partial unique index `doi_unique_decline ON driver_order_interactions(driver_id, order_id) WHERE interaction_type = 'declined'`, supporting indexes, and RLS policy `driver_interactions_select USING (driver_id = auth.uid())`
- [x] T005 Create Migration 2 `supabase/migrations/20260920000002_driver_fulfillment_rpcs.sql` with `validate_order_transition` maintenance-escape amendment (`if coalesce(current_setting('app.order_maintenance', true), '') = 'on' then return new;`) plus RPCs `toggle_driver_availability`, `get_available_orders`, `decline_order`, `advance_order_status`, `release_order`, `get_driver_history` and `GRANT EXECUTE` to `authenticated, service_role`
- [x] T006 [P] Create `AvailableOrderPreview` entity in `src/features/drivers/domain/entities/AvailableOrderPreview.ts` (id, storeName, storeNeighbourhood from `restaurants.address`, itemCount, createdAt — no customer address/phone)
- [x] T007 [P] Create `DriverOrderInteraction` entity in `src/features/drivers/domain/entities/DriverOrderInteraction.ts` (`InteractionType = 'declined' | 'released'`, `reason: string | null` mandatory for `'released'`, null for `'declined'`)
- [x] T008 [P] Create `DeliveryHistoryEntry` entity in `src/features/drivers/domain/entities/DeliveryHistoryEntry.ts` (`HistoryStatus = 'completed' | 'declined' | 'released' | 'cancelled'`, `releaseReason` shown for `'released'` only, entries newest-first)
- [x] T009 Create `DriverFulfillmentRepository` contract in `src/features/drivers/domain/repositories/DriverFulfillmentRepository.ts` (toggleAvailability, getAvailability, getAvailableOrders, claimOrder via hardened `claim_order`, declineOrder, advanceOrderStatus `accepted -> preparing -> out_for_delivery -> delivered`, releaseOrder with mandatory reason, getActiveOrder via direct RLS query, getDeliveryHistory via `SECURITY DEFINER` RPC)
- [x] T010 [P] Create `DriverRealtimeService` interface in `src/features/drivers/domain/services/DriverRealtimeService.ts` (subscribeToAvailableOrders, subscribeToActiveOrder — pure TS, no Supabase imports)
- [x] T011 [P] Create `NetworkStatusService` interface in `src/features/drivers/domain/services/NetworkStatusService.ts` (getNetworkStatus, subscribeToNetworkStatus — pure TS, no Expo imports)
- [x] T012 Implement `SupabaseDriverFulfillmentRepository` in `src/features/drivers/infrastructure/SupabaseDriverFulfillmentRepository.ts` (all RPC calls + direct active-order query `eq('driver_id', user.id).in('status', ['accepted','preparing','out_for_delivery']).maybeSingle()`)
- [x] T013 [P] Implement `SupabaseDriverRealtimeService` in `src/features/drivers/infrastructure/SupabaseDriverRealtimeService.ts` (Supabase Realtime channels for pending-orders pool and active-order status changes)
- [x] T014 [P] Implement `ExpoNetworkStatusService` in `src/features/drivers/infrastructure/ExpoNetworkStatusService.ts` (expo-network connectivity checks and listeners)
- [x] T015 Create `useNetworkStatus` hook in `src/features/drivers/application/hooks/useNetworkStatus.ts` (reactive online/offline state backed by `ExpoNetworkStatusService`)
- [x] T016 Create `OfflineNoticeBanner` component in `src/features/drivers/presentation/components/OfflineNoticeBanner.tsx` (persistent "No internet connection." banner driven by `useNetworkStatus`)
- [x] T017 Apply both migrations to local Supabase and verify RPCs exist and `get_available_orders()` returns `[]::jsonb` for an Offline driver per `specs/003-driver-fulfillment/quickstart.md` Scenario 1 step 5

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Driver Availability Toggle (Priority: P1) 🎯 MVP

**Goal**: Driver switches between Available and Offline; Offline hides the order pool and all order access is rejected server-side.

**Independent Test**: Toggle status and verify order access is granted only when Available — via normal app flow AND via a direct `get_available_orders()` / `claim_order` call while Offline (quickstart Scenario 1; SC-001: effect visible within 2 seconds).

- [x] T018 [US1] Create `useDriverAvailability` hook in `src/features/drivers/application/hooks/useDriverAvailability.ts` (TanStack Query `['driver','availability']` + `toggle_driver_availability` mutation, cache invalidation on success, abort with "No connection — please retry" when offline)
- [x] T019 [P] [US1] Create `AvailabilityToggle` switch component in `src/features/drivers/presentation/components/AvailabilityToggle.tsx` (Available/Offline states bound to `useDriverAvailability`)
- [x] T020 [US1] Implement available-orders shell with availability gating in `src/app/(driver)/available-orders/index.tsx` (render `AvailabilityToggle`, show "You are currently offline. Go online to view and accept orders." and hide pool entirely when Offline)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Browse and Claim an Available Order (Priority: P1)

**Goal**: Available driver sees a real-time privacy-safe pool of unclaimed orders and can atomically claim one, revealing full delivery details; a lost race shows "no longer available".

**Independent Test**: Two driver accounts attempt to accept the same order simultaneously — exactly one succeeds and the other receives a clear failure message (quickstart Scenario 3; SC-002: 0% silent double-accept rate).

- [x] T021 [US2] Create `useAvailableOrders` hook in `src/features/drivers/application/hooks/useAvailableOrders.ts` (TanStack Query `['driver','availableOrders']` via `get_available_orders`, Realtime invalidation via `SupabaseDriverRealtimeService`, returns `[]` and hides list entirely when driver has an active order, abort claim with "No connection — please retry" when offline)
- [x] T022 [P] [US2] Create `AvailableOrderCard` component in `src/features/drivers/presentation/components/AvailableOrderCard.tsx` (store name, store neighbourhood from `restaurants.address`, item count — strictly no customer address or phone)
- [x] T023 [US2] Implement unclaimed order preview detail in `src/app/(driver)/available-orders/[id].tsx` (same privacy-safe fields as the card plus Accept action)
- [x] T024 [P] [US2] Create `useActiveOrder` read hook in `src/features/drivers/application/hooks/useActiveOrder.ts` (direct RLS query for order with `driver_id = user.id` and status in `accepted, preparing, out_for_delivery`, full delivery details visible only post-claim)
- [x] T025 [US2] Implement claim flow in `src/app/(driver)/available-orders/index.tsx` (call `claim_order(p_order_id, p_driver_id)`, on `claimed: true` navigate to active order with full address/contact, on `claimed: false` show "This order is no longer available." banner and drop the order from the list; empty-pool empty state per FR-015)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 4 - Advance Order Through Delivery Lifecycle (Priority: P1)

**Goal**: Driver advances the active order strictly `accepted -> preparing -> out_for_delivery -> delivered`; skips/backwards moves are rejected server-side and the customer view updates automatically.

**Independent Test**: Attempt to advance an order out of sequence — server rejects the invalid transition and the order stays in its current state (quickstart Scenario 6).

- [x] T026 [US4] Add `advanceOrderStatus` sequential-stepper mutation to `src/features/drivers/application/hooks/useActiveOrder.ts` (calls no-parameter `advance_order_status(p_order_id)`, surfaces `INVALID_STATUS_TRANSITION` errors, invalidates `['driver','activeOrder']` and `['driver','history']` on `delivered`, aborts with "No connection — please retry" when offline)
- [x] T027 [P] [US4] Create `ActiveOrderCard` component in `src/features/drivers/presentation/components/ActiveOrderCard.tsx` (full delivery address, items, and single next-step action button: "Store is Preparing" → "Out for Delivery" → "Delivered")
- [x] T028 [US4] Implement active-order fulfillment screen in `src/app/(driver)/active-order.tsx` (render `ActiveOrderCard` stepper, clear `driver_profiles.current_order_id` path on `delivered`, customer order-status view syncs via existing Realtime — no new customer UI)

**Checkpoint**: All P1 fulfillment-core stories (US1, US2, US4) independently functional

---

## Phase 6: User Story 7 - Role Enforcement & Access Control (Priority: P1)

**Goal**: Only driver-role users can access driver screens or perform driver actions; customers are redirected and server-side requests are rejected.

**Independent Test**: Customer-role account attempts direct navigation to a driver route and a driver API action — both fail server-side (SC-005: 100% of unauthorized actions rejected; verified against the US7 acceptance criteria in spec.md — the quickstart has no separate role-guard scenario).

- [x] T029 [US7] Harden driver route-group protection and mount `OfflineNoticeBanner` in `src/app/(driver)/_layout.tsx` (redirect unauthenticated users to `/(auth)/login`, redirect non-driver roles away from driver content, render `OfflineNoticeBanner` above tabs)
- [x] T030 [US7] Add explicit recoverable malformed/missing-profile error state in `src/app/(driver)/_layout.tsx` reusing `src/features/auth/presentation/components/ProfileErrorView.tsx` (never silently misroute into driver screens)

**Checkpoint**: All P1 stories (US1, US2, US4, US7) independently functional

---

## Phase 7: User Story 3 - Decline an Order (Priority: P2)

**Goal**: Driver declines an unwanted order; it disappears from only their list (recorded in `driver_order_interactions` as `'declined'`) and stays claimable for others.

**Independent Test**: Decline as Driver A → order vanishes from A's list (interaction row present in DB) and remains visible/claimable as Driver B (quickstart Scenario 5).

- [x] T031 [US3] Add `declineOrder` mutation to `src/features/drivers/application/hooks/useAvailableOrders.ts` (calls `decline_order(p_order_id)`, removes order from `['driver','availableOrders']` cache immediately, invalidates `['driver','history']`, aborts with "No connection — please retry" when offline)
- [x] T032 [US3] Add Decline action to `src/features/drivers/presentation/components/AvailableOrderCard.tsx` (Decline button wired to the `declineOrder` mutation; pool query already excludes `interaction_type = 'declined'` rows for the caller only)

**Checkpoint**: User Stories 1, 2, 4, 7 AND 3 independently functional

---

## Phase 8: User Story 5 - View Delivery History (Priority: P2)

**Goal**: Driver history screen lists completed, declined, released, and cancelled orders newest-first with store name, date/time, final status, and release reasons.

**Independent Test**: Complete a full accept → delivered cycle and verify it appears in history with correct status (quickstart Scenario 9; SC-006: any past order locatable within 5 seconds).

- [x] T033 [US5] Create `useDriverHistory` hook in `src/features/drivers/application/hooks/useDriverHistory.ts` (TanStack Query `['driver','history']` via `SECURITY DEFINER get_driver_history()` — required because released orders have `driver_id = NULL` and are hidden by standard orders RLS — newest-first ordering)
- [x] T034 [P] [US5] Create `DeliveryHistoryCard` component in `src/features/drivers/presentation/components/DeliveryHistoryCard.tsx` (store name, order date/time, status badge `completed / declined / released / cancelled`, mandatory release reason displayed for `'released'` entries)
- [x] T035 [US5] Implement delivery history list in `src/app/(driver)/history/index.tsx` (newest-first list of `DeliveryHistoryCard`, appropriate empty state instead of blank/frozen screen per FR-015)
- [x] T036 [US5] Implement delivery history detail in `src/app/(driver)/history/[id].tsx` (full entry detail including release reason where applicable)

**Checkpoint**: All user stories so far (US1, US2, US4, US7, US3, US5) independently functional

---

## Phase 9: User Story 8 - Order Release / Stuck Order Resolution (Priority: P2)

**Goal**: Driver with an uncompletable active order self-reports with a mandatory reason; the order reverts to `pending` with `driver_id = NULL` (no distinct "released" lifecycle state) and re-enters the shared pool.

**Independent Test**: Accept as driver → release with reason → order reappears in the pool for another driver and the reason appears in the releasing driver's history; empty-reason submit is blocked; repeat releases succeed without unique violations (quickstart Scenarios 7–8).

- [x] T037 [US8] Add `releaseOrder` mutation to `src/features/drivers/application/hooks/useActiveOrder.ts` (calls `release_order(p_order_id, p_reason)` with `TRIM(p_reason)` non-empty validation, invalidates `['driver','activeOrder']`, `['driver','availableOrders']`, and `['driver','history']`, aborts with "No connection — please retry" when offline)
- [x] T038 [P] [US8] Create `OrderReleaseModal` component in `src/features/drivers/presentation/components/OrderReleaseModal.tsx` (mandatory reason text field, submit disabled with "Please provide a reason for releasing this order." when empty/whitespace, no daily/shift cap enforced)
- [x] T039 [US8] Integrate "Report Issue / Release Order" flow into `src/app/(driver)/active-order.tsx` (open `OrderReleaseModal`, on success clear active view so driver can accept new orders; released order reappears for other drivers as a plain unclaimed order)

**Checkpoint**: All user stories except profile (US1, US2, US4, US7, US3, US5, US8) independently functional

---

## Phase 10: User Story 6 - Driver Profile & Sign-Out (Priority: P3)

**Goal**: Driver profile screen shows own info, current availability status, and sign-out; mirrors the customer profile screen structure.

**Independent Test**: View profile, tap sign-out, verify redirect to the authentication flow with no re-entry without signing in.

- [x] T040 [US6] Implement driver profile screen in `src/app/(driver)/profile.tsx` (driver name/info, current availability status with `AvailabilityToggle` reuse from `src/features/drivers/presentation/components/AvailabilityToggle.tsx`, sign-out via the exact method `signOut()` from `useAuth()` (`src/features/auth/application/hooks/useAuth.ts`, provided by AuthContext — it clears the Supabase session and purges the TanStack Query cache) then `router.replace('/(auth)/login')`)

**Checkpoint**: All user stories independently functional

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T041 Verify strict TypeScript compliance with `npx tsc --noEmit` (no new type errors in `src/features/drivers/` or `src/app/(driver)/`)
- [x] T042 [P] Verify lint compliance with `npm run lint` for all new/modified driver files
- [x] T043 Run full `specs/003-driver-fulfillment/quickstart.md` validation (Scenarios 1–10 covering all 8 user stories and edge cases: offline pool, double-claim race, single-active-order guard, repeat releases, `current_order_id` clearing)
- [x] T044 Audit empty states per FR-015 / SC-007 (no available orders, no history items, offline pool) across `src/app/(driver)/available-orders/index.tsx` and `src/app/(driver)/history/index.tsx` — empty-state screen shown in 100% of empty cases
- [x] T045 Verify realtime propagation (SC-003: pool updates reach Available drivers within 3 seconds) and customer order-status sync on every driver status advance (FR-010) with concurrent refreshes
- [x] T046 Code cleanup and refactoring across `src/features/drivers/` (remove dead code, confirm Domain layer imports no Supabase/React Native/Expo/TanStack/Redux per Constitution Principles II–III, confirm no driver state in Redux per Principle IV)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3–10)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US4 → US7 → US3 → US5 → US8 → US6)
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Extends the US1 shell in `available-orders/index.tsx` sequentially (same file, not parallel)
- **User Story 4 (P1)**: Can start after Foundational (Phase 2) - Extends `useActiveOrder.ts` created in US2 sequentially; independently testable via `advance_order_status`
- **User Story 7 (P1)**: Can start after Foundational (Phase 2) - Hardens the pre-existing basic role gate in `(driver)/_layout.tsx`; no dependency on story screens
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Extends `useAvailableOrders.ts` (US2) and `AvailableOrderCard.tsx` (US2) sequentially
- **User Story 5 (P2)**: Can start after Foundational (Phase 2) - Independent hook + screens; US3's history visibility completes once this phase lands
- **User Story 8 (P2)**: Can start after Foundational (Phase 2) - Extends `useActiveOrder.ts` (US2/US4) and `active-order.tsx` (US4) sequentially; history rendering reuses US5's invalidated cache
- **User Story 6 (P3)**: Can start after Foundational (Phase 2) - Reuses `AvailabilityToggle.tsx` (US1); fully independent screen

### Within Each User Story

- Hooks/repository wiring before components
- Components before route screens
- Core implementation before integration into shared files (`available-orders/index.tsx`, `useActiveOrder.ts`, `active-order.tsx` edited sequentially across stories, never in parallel)
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003)
- All Foundational entity/interface tasks marked [P] can run in parallel (T006, T007, T008, T010, T011); infra implementations T013, T014 run in parallel once contracts land
- Once Foundational phase completes, US7 and US6 can start in parallel with any other story (disjoint files, if team capacity allows)
- Component tasks marked [P] can run in parallel with their story's hook tasks (T019 with T018; T022/T024 with T021; T027 with T026; T034 with T033; T038 with T037)
- `npm run lint` (T042) can run in parallel with `npx tsc --noEmit` (T041)

---

## Parallel Example: User Story 2

```bash
# Launch all independent work for User Story 2 together:
Task: "Create useAvailableOrders hook in src/features/drivers/application/hooks/useAvailableOrders.ts" (T021)
Task: "Create AvailableOrderCard component in src/features/drivers/presentation/components/AvailableOrderCard.tsx" (T022) [P]
Task: "Create useActiveOrder read hook in src/features/drivers/application/hooks/useActiveOrder.ts" (T024) [P]
# Then sequentially:
Task: "Implement unclaimed order preview detail in src/app/(driver)/available-orders/[id].tsx" (T023, reuses card)
Task: "Implement claim flow in src/app/(driver)/available-orders/index.tsx" (T025, depends on T021/T022/T024)
```

## Parallel Example: Foundational Phase

```bash
# Launch all domain entities and service interfaces together:
Task: "Create AvailableOrderPreview entity in src/features/drivers/domain/entities/AvailableOrderPreview.ts" (T006) [P]
Task: "Create DriverOrderInteraction entity in src/features/drivers/domain/entities/DriverOrderInteraction.ts" (T007) [P]
Task: "Create DeliveryHistoryEntry entity in src/features/drivers/domain/entities/DeliveryHistoryEntry.ts" (T008) [P]
Task: "Create DriverRealtimeService interface in src/features/drivers/domain/services/DriverRealtimeService.ts" (T010) [P]
Task: "Create NetworkStatusService interface in src/features/drivers/domain/services/NetworkStatusService.ts" (T011) [P]
# Then sequentially: repository contract (T009), infra implementations (T012–T014), hooks/banner (T015–T016), migration apply (T017)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (availability toggle + offline gating)
4. **STOP and VALIDATE**: Test User Story 1 independently per quickstart Scenario 1
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (availability gate) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (browse + atomic claim) → Test independently → Deploy/Demo (core value!)
4. Add User Story 4 (lifecycle stepper) + User Story 7 (role hardening) → Test independently → Deploy/Demo
5. Add User Story 3 (decline) → User Story 5 (history) → User Story 8 (release) → Test independently → Deploy/Demo
6. Add User Story 6 (profile parity) → Polish → Final validation
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 → User Story 2 → User Story 3 (pool thread; owns `available-orders/` + `useAvailableOrders.ts`)
   - Developer B: User Story 4 → User Story 8 (active-order thread; owns `useActiveOrder.ts` + `active-order.tsx` after A's T024 lands)
   - Developer C: User Story 7 → User Story 5 → User Story 6 (shell/history thread; owns `_layout.tsx`, `history/`, `profile.tsx`)
3. Stories complete and integrate independently (shared files edited sequentially, never concurrently)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- No automated test tasks: spec.md requests no test suite; validation is via quickstart Scenarios 1–10 at each checkpoint
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts (shared files `available-orders/index.tsx`, `useActiveOrder.ts`, `useAvailableOrders.ts`, `AvailableOrderCard.tsx`, `active-order.tsx`, `(driver)/_layout.tsx` are extended sequentially across stories), cross-story dependencies that break independence
- Constitution compliance per task: Domain layer stays pure TS (Principles II–III), TanStack Query owns all driver server state (Principle IV), all mutations enforce server authority via `SECURITY DEFINER` RPCs (Principle V), claiming stays atomic via `claim_order` (Principle VI), no optimistic writes while offline (FR-016)
