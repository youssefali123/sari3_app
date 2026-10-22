# Implementation Tasks: Error Handling & Resilience

**Feature Branch**: `012-error-handling-resilience`  
**Date**: 2026-10-22  
**Spec**: [specs/012-error-handling-resilience/spec.md](spec.md)  
**Plan**: [specs/012-error-handling-resilience/plan.md](plan.md)  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize base error models, shared classifiers, and localized message dictionaries.

- [ ] T001 [P] Create base application error abstractions and dictionary types in `src/shared/types/errors.ts`
- [ ] T002 [P] Implement shared classifier helpers (`isNetworkError`, `getPostgresErrorCode`, `getErrorMessageString`) in `src/shared/lib/errorClassifier.ts`
- [ ] T003 [P] Create shared Arabic error message dictionary in `src/shared/ui/messages/sharedErrorMessages.ar.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish core network/foreground synchronization, offline component states, and startup hydration gates required before implementing user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 Wire TanStack Query `onlineManager` with `expo-network` (`addNetworkStateListener`) and `focusManager` with React Native `AppState` in `src/shared/lib/queryClient.ts`
- [ ] T005 Configure QueryClient default options with `refetchOnWindowFocus: true`, `queries.retry: 2`, and `mutations: { retry: 0, networkMode: 'always' }` in `src/shared/lib/queryClient.ts`
- [ ] T006 [P] Update `src/shared/ui/components/ErrorState.tsx` to support Arabic defaults, offline state ("لا يتوفر اتصال بالإنترنت"), and retry actions
- [ ] T007 Expose awaitable cart hydration readiness (`isCartHydrated`, `waitForCartHydration()`) with a 1,500ms safety timeout in `src/shared/lib/store.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Arabic Error Messages Instead of Raw Server Strings (Priority: P1) 🎯 MVP

**Goal**: Deliver clear, helpful Arabic error messages for all known server errors, database exceptions, and network drops, completely eliminating raw technical backend error strings from presentation code.

**Independent Test**: Trigger simulated or real server errors (store closed, product unavailable, duplicate driver claim, cancelled order) and verify the screen displays the corresponding Arabic message, never a raw backend string or code (`STORE_CLOSED`, `23505`, `42501`). Run static grep across presentation code to confirm zero unmapped `error.message` displays.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Define orders domain error kinds and `OrderError` type in `src/features/orders/domain/entities/OrderError.ts`
- [ ] T009 [P] [US1] Create orders Arabic error message dictionary in `src/features/orders/presentation/messages/ordersErrorMessages.ar.ts`
- [ ] T010 [US1] Implement `classifyOrderError` mapper for PostgreSQL codes and RPC error strings in `src/features/orders/infrastructure/orderErrorClassifier.ts`
- [ ] T011 [US1] Integrate `classifyOrderError` into `src/features/orders/infrastructure/SupabaseOrderRepository.ts`
- [ ] T012 [P] [US1] Define drivers domain error kinds and `DriverError` type in `src/features/drivers/domain/entities/DriverError.ts`
- [ ] T013 [P] [US1] Create drivers Arabic error message dictionary in `src/features/drivers/presentation/messages/driversErrorMessages.ar.ts`
- [ ] T014 [US1] Implement `classifyDriverError` mapper for PostgreSQL codes (`23505`, `42501`, `P0002`) and RPC exceptions in `src/features/drivers/infrastructure/driverErrorClassifier.ts`
- [ ] T015 [US1] Integrate `classifyDriverError` into `src/features/drivers/infrastructure/SupabaseDriverFulfillmentRepository.ts`
- [ ] T016 [P] [US1] Define addresses domain error kinds and `AddressError` type in `src/features/addresses/domain/entities/AddressError.ts`
- [ ] T017 [P] [US1] Create addresses Arabic error message dictionary in `src/features/addresses/presentation/messages/addressesErrorMessages.ar.ts`
- [ ] T018 [US1] Implement `classifyAddressError` mapper and integrate into `src/features/addresses/infrastructure/SupabaseAddressRepository.ts`
- [ ] T019 [US1] Update `src/app/checkout.tsx` to replace raw `error.message` with Arabic dictionary lookup and log technical details in `__DEV__`
- [ ] T020 [US1] Update `src/app/addresses.tsx` and `src/features/addresses/presentation/AddressSelectionModal.tsx` to replace raw `error.message` with Arabic dictionary lookup
- [ ] T021 [US1] Update customer orders screens (`src/app/(customer)/orders/index.tsx` and `src/app/(customer)/orders/[id].tsx`) to replace raw `error.message` with Arabic dictionary lookup
- [ ] T022 [US1] Update driver available orders screens (`src/app/(driver)/available-orders/index.tsx` and `src/app/(driver)/available-orders/[id].tsx`) to replace raw `error.message` with Arabic dictionary lookup
- [ ] T023 [US1] Update driver active order components (`src/app/(driver)/active-order.tsx` and `src/features/drivers/presentation/components/ActiveOrderCard.tsx`) to replace raw `error.message` with Arabic dictionary lookup
- [ ] T024 [US1] Update driver history screens (`src/app/(driver)/history/index.tsx` and `src/app/(driver)/history/[id].tsx`) to replace raw `error.message` with Arabic dictionary lookup
- [ ] T025 [US1] Update driver modal components (`src/features/drivers/presentation/components/AvailabilityToggle.tsx` and `OrderReleaseModal.tsx`) to replace raw `error.message` with Arabic dictionary lookup
- [ ] T026 [US1] Update customer and driver profile screens (`src/app/(customer)/profile.tsx` and `src/app/(driver)/profile.tsx`) to replace raw `error.message` with Arabic dictionary lookup

**Checkpoint**: At this point, User Story 1 is complete. Zero raw backend strings appear in UI.

---

## Phase 4: User Story 2 - Network Awareness and Foreground Refetch (Priority: P1)

**Goal**: Seamlessly pause queries when offline, display explicit offline states with retry actions when cache is missing, resume queries on reconnect, and automatically refetch stale queries when returning to foreground.

**Independent Test**: Enable Airplane Mode on an order screen; verify cached data stays visible. Open uncached screen in Airplane Mode; verify Arabic offline state with retry button. Restore connectivity; verify automatic refetch without user action within 5 seconds. Background app for 35 seconds; verify refetch on return within 3 seconds.

### Implementation for User Story 2

- [ ] T027 [US2] Update customer order list screen `src/app/(customer)/orders/index.tsx` to render explicit offline `ErrorState` when `fetchStatus === 'paused' && !data`
- [ ] T028 [US2] Update customer order detail screen `src/app/(customer)/orders/[id].tsx` to render explicit offline `ErrorState` when `fetchStatus === 'paused' && !data`
- [ ] T029 [US2] Update driver pool screen `src/app/(driver)/available-orders/index.tsx` to render explicit offline `ErrorState` when offline and no cache is present
- [ ] T030 [US2] Update driver active order screen `src/app/(driver)/active-order.tsx` to render explicit offline `ErrorState` when offline and no cache is present
- [ ] T031 [US2] Ensure all data screen query hooks verify offline failure and manual retry triggers refetch without infinite spinners

**Checkpoint**: User Stories 1 and 2 work independently and in combination.

---

## Phase 5: User Story 3 - Writes with Unknown Outcome (Priority: P1)

**Goal**: Treat lost write responses as unknown outcome rather than definitive failure. Keep users on screen with idempotent retry (reusing idempotency keys) and query invalidation. For driver claim races (`23505`), resolve active order state automatically.

**Independent Test**: Drop connection immediately after confirming an order; verify customer remains on checkout, receives the unknown-outcome alert, and can retry idempotently or navigate to orders. Simulate driver claim race returning `23505`; verify driver transitions to their active order directly.

### Implementation for User Story 3

- [ ] T032 [US3] Implement unknown outcome alert in `src/app/checkout.tsx` on network failure, keeping customer on checkout, preserving `idempotencyKey`, invalidating `['orders']`, and offering "إعادة المحاولة" (idempotent retry) and "عرض طلباتي" (navigate to `/orders`)
- [ ] T033 [US3] Update driver claim handling in `src/features/drivers/application/hooks/useAvailableOrders.ts` and `src/app/(driver)/available-orders/index.tsx` to inspect active order when encountering `23505` conflict; treat matching order as success and offer "عرض الطلب النشط" for a different active order
- [ ] T034 [US3] Update order cancellation in `src/app/(customer)/orders/[id].tsx` to trigger immediate query refetch on `ORDER_CANNOT_BE_CANCELLED` or state conflicts after a lost response, calmly showing the cancelled state without an error dialog
- [ ] T035 [US3] Update driver order advancement and release in `src/features/drivers/presentation/components/ActiveOrderCard.tsx` and `OrderReleaseModal.tsx` to trigger query refetch on state conflict, updating the screen to authoritative state

**Checkpoint**: All write operations handle lost responses safely without duplicate creation or confusing false failure alerts.

---

## Phase 6: User Story 4 - Realtime Recovery After Disconnects (Priority: P2)

**Goal**: Automatically refetch authoritative state from Supabase when Realtime channels reconnect after disconnection, ensuring no missed status changes leave the UI stale.

**Independent Test**: Open order details, disconnect network, update order status in database, reconnect; verify status updates automatically upon reconnection without manual pull-to-refresh.

### Implementation for User Story 4

- [ ] T036 [US4] Add channel status listener (`SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) and query invalidation on reconnect in `src/features/orders/infrastructure/SupabaseOrderRealtimeService.ts`
- [ ] T037 [US4] Add channel status listener and query invalidation on reconnect in `src/features/drivers/infrastructure/SupabaseDriverRealtimeService.ts`
- [ ] T038 [US4] Ensure channel cleanup in `Unsubscribe` callback via `supabase.removeChannel(channel)` in both services to prevent duplicate sockets and memory leaks across reconnects

**Checkpoint**: Realtime subscriptions automatically heal and refetch upon reconnect.

---

## Phase 7: User Story 5 - Root Error Boundary (Priority: P2)

**Goal**: Catch unhandled render crashes in any screen and present a friendly Arabic recovery screen with retry and escape actions, avoiding white screens.

**Independent Test**: Throw an intentional render error in a test screen; verify Arabic recovery boundary appears with working "إعادة المحاولة" and "العودة للرئيسية" buttons and developer diagnostics in `__DEV__`.

### Implementation for User Story 5

- [ ] T039 [P] [US5] Implement zero-dependency `RootErrorBoundary` component with pure React Native primitives, system fonts, and safe styling in `src/shared/ui/components/ErrorBoundary.tsx`
- [ ] T040 [US5] Export `ErrorBoundary` from root layout `src/app/_layout.tsx` following Expo Router conventions
- [ ] T041 [US5] Implement dual recovery actions ("إعادة المحاولة" via `props.retry()` and "العودة للرئيسية" via `router.replace('/')`) and collapsible `__DEV__` error diagnostics in `src/shared/ui/components/ErrorBoundary.tsx`

**Checkpoint**: Fatal render crashes are gracefully contained with clear Arabic recovery actions.

---

## Phase 8: User Story 6 - Cart Hydration at Startup (Priority: P2)

**Goal**: Ensure persisted cart contents and idempotency key are loaded from AsyncStorage before dismissing the splash screen, eliminating empty cart flashes on cold start.

**Independent Test**: Quit app with cart items, reopen directly to `/cart` or `/checkout`; verify cart contents appear on first render with no empty flash.

### Implementation for User Story 6

- [ ] T042 [US6] Connect `waitForCartHydration()` from `src/shared/lib/store.ts` into startup readiness state (`isAppReady`) in `src/app/_layout.tsx`
- [ ] T043 [US6] Ensure splash screen dismissal in `src/app/_layout.tsx` waits for cart hydration while enforcing safety timeout fallback so startup is never blocked

**Checkpoint**: Cold starts preserve and render cart state on first paint.

---

## Phase 9: User Story 7 - Cart Revalidation Before Checkout (Priority: P2)

**Goal**: Revalidate cart item prices and availability against the live catalog when entering `/checkout`. Require customer consent for price changes via a blocking sheet and disable checkout until unavailable items are resolved.

**Independent Test**: Add items, alter product price in database, open `/checkout`; verify blocking sheet displays old vs new prices. Accept changes; verify cart updates and checkout proceeds. Alter product to unavailable; verify checkout is disabled until removed.

### Implementation for User Story 7

- [ ] T044 [P] [US7] Define cart revalidation entities and types (`CartRevalidationResult`, `CartPriceDifference`, `CartUnavailableItem`) in `src/features/cart/domain/entities/CartRevalidation.ts`
- [ ] T045 [P] [US7] Add `updateCartItemPrices` and `removeUnavailableItems` reducers to `src/features/cart/application/cartSlice.ts`
- [ ] T046 [US7] Implement `useCartRevalidation` hook leveraging `ProductRepository.getProductsByStore` and `StoreRepository.getStoreById` in `src/features/cart/application/hooks/useCartRevalidation.ts`
- [ ] T047 [P] [US7] Implement blocking price change bottom-sheet/modal `PriceChangeModal.tsx` in `src/features/cart/presentation/components/PriceChangeModal.tsx`
- [ ] T048 [US7] Integrate `useCartRevalidation` and `PriceChangeModal` into `src/app/checkout.tsx`: block confirmation if store is closed, flag unavailable items for removal, and require explicit price acceptance

**Checkpoint**: Customers are protected from silent price discrepancies before confirming orders.

---

## Phase 10: User Story 8 - Session Expiry Handling (Priority: P2)

**Goal**: Gracefully handle auth token expiration by wiring Supabase auto-refresh to `AppState` and transitioning expired sessions to guest mode or login via an Arabic dialog.

**Independent Test**: Invalidate auth session; trigger authenticated query; verify Arabic session expired dialog appears with "تسجيل الدخول" and "متابعة كزائر" actions, cleanly clearing customer cache without cascading 42501 errors.

### Implementation for User Story 8

- [ ] T049 [US8] Wire `AppState` listener for `supabase.auth.startAutoRefresh()` and `stopAutoRefresh()` in `src/shared/lib/supabase.ts`
- [ ] T050 [US8] Add session expired Arabic message mappings to `src/features/auth/presentation/components/authErrorToMessage.ts`
- [ ] T051 [US8] Update `src/features/auth/application/context/AuthContext.tsx` to show session invalidation dialog with "تسجيل الدخول" and "متابعة كزائر" actions, defaulting to guest navigation on dismiss
- [ ] T052 [US8] Ensure `signOut` sequence in `src/features/auth/application/context/AuthContext.tsx` tolerates already-invalid session state without throwing

**Checkpoint**: Session expiration transitions smoothly to guest browsing or re-authentication.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Validate static analysis guarantees, run verification tests, and complete documentation.

- [ ] T053 Run static analysis check `grep -rn 'error.message' src/app src/features/*/presentation` to verify zero raw backend strings remain
- [ ] T054 [P] Run unit tests for error classifiers and revalidation comparison using `tsx --test`
- [ ] T055 Execute all 8 runnable validation scenarios in `specs/012-error-handling-resilience/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: No dependencies — can start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **Phase 3 (User Story 1 - P1)**: Depends on Phase 2 completion. Delivers core MVP.
- **Phase 4 (User Story 2 - P1)**: Depends on Phase 2 completion; integrates with Phase 3 UI screens.
- **Phase 5 (User Story 3 - P1)**: Depends on Phase 2 & Phase 3 (uses classified errors & idempotent retry).
- **Phases 6–10 (User Stories 4–8 - P2)**: Depend on Phase 2 completion; can proceed in parallel or sequentially.
- **Phase 11 (Polish)**: Depends on all user stories being complete.

### User Story Completion Graph
```text
[Phase 1: Setup]
       │
       ▼
[Phase 2: Foundational]
       │
       ├──────────────────────────────────────┬───────────────────────────────────┐
       ▼                                      ▼                                   ▼
[Phase 3: US1 - Arabic Errors (MVP)]  [Phase 7: US5 - Boundary]   [Phase 8: US6 - Hydration]
       │                                      │                                   │
       ├───────────────────┐                  │                                   │
       ▼                   ▼                  │                                   │
[Phase 4: US2 - Offline] [Phase 5: US3 - Unknown Writes]                          │
       │                   │                                                      │
       ▼                   ▼                                                      │
[Phase 6: US4 - Realtime Recovery]                                                │
       │                                                                          │
       ├──────────────────────────────────────┬───────────────────────────────────┘
       ▼                                      ▼
[Phase 9: US7 - Revalidation]         [Phase 10: US8 - Auth Expiry]
       │                                      │
       └───────────────────┬──────────────────┘
                           ▼
                 [Phase 11: Polish]
```

---

## Parallel Opportunities

- **Setup Phase**: T001, T002, and T003 can run in parallel.
- **Foundational Phase**: T006 can run in parallel with T004/T005/T007.
- **User Story 1**:
  - Domain error kinds and dictionaries (T008, T009, T012, T013, T016, T017) can all run in parallel.
  - Classifiers (T010, T014, T018) can run in parallel once domain types exist.
  - Screen updates (T019 through T026) can be parallelized across different files.
- **User Story 5, 6, 7**: Once Foundational is complete, Root Error Boundary (T039-T041) and Cart Startup Hydration (T042-T043) can run in parallel with User Story 1.

---

## Implementation Strategy

### MVP Delivery (User Story 1)
1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T007)
3. Complete Phase 3: User Story 1 (T008–T026)
4. **VALIDATE MVP**: Verify zero raw error messages appear when triggering backend errors.

### Incremental Feature Milestones
- **Increment 1 (P1 Reliability)**: Complete Phase 4 (Network awareness & foreground refetch) and Phase 5 (Unknown outcome writes).
- **Increment 2 (P2 Realtime & Boundary)**: Complete Phase 6 (Realtime disconnect recovery) and Phase 7 (Root Error Boundary).
- **Increment 3 (P2 Data Integrity & Security)**: Complete Phase 8 (Cart hydration), Phase 9 (Cart revalidation), and Phase 10 (Session expiry).
- **Increment 4 (Verification & Polish)**: Complete Phase 11 (Static analysis grep, tests, quickstart scenarios).
