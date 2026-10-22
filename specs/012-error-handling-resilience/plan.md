# Implementation Plan: Error Handling & Resilience

**Branch**: `012-error-handling-resilience` | **Date**: 2026-10-22 | **Spec**: [specs/012-error-handling-resilience/spec.md](spec.md)

**Input**: Feature specification from `specs/012-error-handling-resilience/spec.md` and design requirements for comprehensive error handling, network awareness, and runtime resilience across the application.

---

## Summary

Implement a full error-handling and resilience pass across the mobile application:
- **Error Classification & Localization**: Introduce typed domain error models (`AppError<TKind>`) and pure infrastructure error classifiers to translate raw backend strings, PostgreSQL error codes (e.g., `42501`, `23505`, `P0002`), and network drops into domain kinds. Centralize Arabic user-facing messages in dedicated dictionaries per feature and eliminate 100% of raw backend error displays across presentation screens.
- **Network Awareness & Lifecycle Sync**: Wire TanStack Query's `onlineManager` to `expo-network` and `focusManager` to React Native's `AppState`. Set query `refetchOnWindowFocus: true` and mutation `networkMode: 'always'` with `retry: 0` to fail fast while offline. Display an explicit Arabic offline state with retry actions when cached data is unavailable.
- **Safe Unknown-Outcome Writes**: For network failures on writes (`place_order`, `claim_order`, `cancel_order`, `advance_order_status`, `release_order`), never report definitive failure. Provide an Arabic alert with safe idempotent retry (preserving the existing `idempotencyKey`) and query invalidation. For driver claim conflicts (`23505`), automatically inspect active order state and guide the driver smoothly.
- **Realtime Disconnect Recovery**: Track Realtime channel statuses (`SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`) within infrastructure services, invalidating and refetching authoritative server state upon reconnect without leaking channel types into the domain.
- **Root Error Boundary**: Export a zero-dependency root `ErrorBoundary` from `src/app/_layout.tsx` using React Native primitives and safe styling, providing dual Arabic recovery actions ("إعادة المحاولة" and "العودة للرئيسية") and developer diagnostics in `__DEV__`.
- **Startup Cart Hydration Gating**: Synchronize AsyncStorage cart rehydration with the native splash screen dismissal lifecycle in `_layout.tsx`, backed by a 1.5s safety timeout to prevent white screens or empty cart flashes.
- **Pre-Checkout Cart Revalidation**: Automatically verify live prices and item availability when entering `/checkout`. Block order confirmation with an informative bottom-sheet detailing price differences until explicit customer acceptance, while flagging discontinued items for one-tap removal.
- **Session Expiry Resilience**: Bind Supabase `startAutoRefresh()`/`stopAutoRefresh()` to `AppState`, and handle session invalidation through an Arabic dialog with clean sign-out and guest mode transition.

---

## Technical Context

**Language/Version**: TypeScript 5.x / React Native 0.86 / React 19

**Primary Dependencies**:
- Mobile Framework: React Native, Expo SDK 57, Expo Router (`~57.0.28`), `expo-network` (`~57.0.2`), `expo-splash-screen` (`^57.0.10`), `expo-system-ui` (`~57.0.3`)
- State Management: `@reduxjs/toolkit` (`^2.12.0`), `@tanstack/react-query` (`^5.102.8`), `@react-native-async-storage/async-storage` (`2.2.0`)
- Backend & Auth: `@supabase/supabase-js` (`^2.116.0`), PostgreSQL 17 RPCs & RLS

**Storage**:
- Server: PostgreSQL (Supabase)
- Client: `@react-native-async-storage/async-storage` (`@sari3_cart_storage_v1`)

**Testing**:
- Static Analysis: `grep -rn 'error.message' src/app src/features/*/presentation`
- Unit Tests: Pure classifier and revalidation comparison tests via `tsx --test`
- Manual Verification: Quickstart verification matrix across offline simulation, forced render crash, price manipulation, and claim race conditions

**Target Platform**: iOS and Android (Expo SDK 57)

**Project Type**: Mobile Application (Clean Architecture + Expo Router)

**Performance Goals**:
- Recovery refetch triggers within 5s of network restoration and within 3s of app foregrounding
- Cart hydration finishes before splash dismiss (< 1.5s)
- Revalidation overhead < 300ms on `/checkout` mount

**Constraints**:
- Domain and Application layers must NOT import React Native, Expo, Supabase, AsyncStorage, Redux, or TanStack Query (Constitution Principle II & III)
- State ownership separation: TanStack Query owns server state, Redux owns local UI/cart state (Principle IV)
- Zero raw backend error strings in UI (FR-003, SC-001)
- Zero external provider dependencies in Root Error Boundary (FR-016)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Requirement | Plan Alignment | Status |
|---|---|---|---|
| **I. Feature-First Structure** | Organize by capability | Classification & dictionaries live inside each feature folder (`features/orders/`, `features/drivers/`, `features/cart/`, `features/auth/`); cross-cutting primitives live in `shared/` | **PASS** |
| **II. Lightweight Clean Architecture** | Clean layer separation; Domain/Application free of platform imports | Domain defines pure `AppError` and revalidation types; Infrastructure handles Supabase/PostgreSQL error codes; Presentation renders Arabic messages | **PASS** |
| **III. Fixed Dependency Direction** | Presentation → Application → Domain ← Infrastructure | UI components import hooks & message dictionaries; Infrastructure implements Domain repository/service interfaces; Domain imports zero outer layers | **PASS** |
| **IV. State Ownership** | Redux for client state, TanStack Query for server state | Cart contents & price acceptance in Redux; orders, products, and driver state in TanStack Query; Realtime events invalidate Query cache directly | **PASS** |
| **Exception IV-A** | Auth session in AuthContext | Session expiry handled via AuthContext and Supabase Auth listeners without duplicating auth state into Redux | **PASS** |
| **V. Server Authority** | Database enforces rules and pricing | Cart revalidation provides customer UX convenience, but PostgreSQL RPC `place_order` remains final authority on pricing and inventory | **PASS** |
| **VI. Atomic Concurrency** | Concurrency writes atomic in DB | Claim races and idempotent replays handled server-side; client detects `23505` and navigates smoothly without client-side race locks | **PASS** |
| **VII. Historical Record Immutability** | Snapshots immutable | Order cancellation/transition hardening respects immutable historical snapshots | **PASS** |
| **VIII. Realtime/Push Decoupled** | Notifications decoupled from business logic | Realtime reconnection refetching encapsulated behind `OrderRealtimeService` and `DriverRealtimeService` | **PASS** |
| **IX. Deferred Scope** | Modular design open for future extension | Arabic dictionaries structured as keyed records allowing future localization (i18n) without domain restructuring | **PASS** |
| **X. Practical MVP Simplicity** | Avoid unnecessary abstractions | Reuses existing `useReorder` logic for revalidation; pure TypeScript classifier functions without complex frameworks | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/012-error-handling-resilience/
├── spec.md                  # Feature requirements and user stories
├── plan.md                  # This file
├── research.md              # Architectural decisions, trade-offs, and research findings
├── data-model.md            # Domain error models, dictionaries, and revalidation entities
├── quickstart.md            # Step-by-step runnable verification scenarios
└── contracts/
    ├── error_classifier_contract.md   # Infrastructure error classification mapping contract
    ├── cart_revalidation_contract.md  # Pre-checkout cart revalidation interface contract
    ├── realtime_recovery_contract.md  # Realtime status observation & reconnection contract
    └── root_error_boundary_contract.md# Zero-dependency root ErrorBoundary contract
```

### Source Code Modifications & Additions

```text
src/
├── shared/
│   ├── types/
│   │   └── errors.ts                                 # AppError, SharedErrorKind, ErrorMessageDictionary
│   ├── lib/
│   │   ├── queryClient.ts                            # onlineManager + focusManager setup, refetchOnWindowFocus
│   │   ├── supabase.ts                               # AppState autoRefresh wiring
│   │   ├── store.ts                                  # isCartHydrated signal / awaitable hydration
│   │   └── errorClassifier.ts                        # Shared base classification helpers
│   └── ui/
│       ├── components/
│       │   ├── ErrorBoundary.tsx                     # Zero-dependency root error boundary
│       │   ├── ErrorState.tsx                        # Arabic defaults & offline state support
│       │   └── index.ts                              # Re-exports
│       └── messages/
│           └── sharedErrorMessages.ar.ts             # Shared Arabic messages (offline, unexpected, network)
│
├── features/
│   ├── auth/
│   │   ├── presentation/
│   │   │   └── components/
│   │   │       └── authErrorToMessage.ts             # Arabic dictionary for auth errors & session expiry
│   │   └── application/
│   │       └── context/
│   │           └── AuthContext.tsx                   # Session invalidation dialog & tolerant sign-out
│   │
│   ├── cart/
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── CartRevalidation.ts              # Revalidation result & price difference entities
│   │   ├── application/
│   │   │   ├── cartSlice.ts                          # updateCartItemPrices & removeUnavailableItems reducers
│   │   │   └── hooks/
│   │   │       └── useCartRevalidation.ts            # Pre-checkout catalog revalidation hook
│   │   └── presentation/
│   │       └── components/
│   │           └── PriceChangeModal.tsx              # Blocking sheet for price difference review
│   │
│   ├── orders/
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── OrderError.ts                     # OrderErrorKind & OrderError types
│   │   ├── infrastructure/
│   │   │   ├── orderErrorClassifier.ts               # PostgreSQL & RPC error code mapper
│   │   │   ├── SupabaseOrderRepository.ts            # Classifies errors on place/cancel/get calls
│   │   │   └── SupabaseOrderRealtimeService.ts       # Status tracking & reconnect invalidation
│   │   └── presentation/
│   │       └── messages/
│   │           └── ordersErrorMessages.ar.ts         # Orders Arabic error dictionary
│   │
│   ├── drivers/
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── DriverError.ts                    # DriverErrorKind & DriverError types
│   │   ├── infrastructure/
│   │   │   ├── driverErrorClassifier.ts              # Driver RPC & 23505 error classifier
│   │   │   ├── SupabaseDriverFulfillmentRepository.ts# Classifies claim/advance/release errors
│   │   │   └── SupabaseDriverRealtimeService.ts      # Status tracking & reconnect invalidation
│   │   └── presentation/
│   │       └── messages/
│   │           └── driversErrorMessages.ar.ts        # Drivers Arabic error dictionary
│   │
│   └── addresses/
│       ├── domain/
│       │   └── entities/
│       │       └── AddressError.ts                   # AddressErrorKind
│       ├── infrastructure/
│       │   ├── addressErrorClassifier.ts             # Address RPC & RLS classifier
│       │   └── SupabaseAddressRepository.ts          # Classifies address errors
│       └── presentation/
│           └── messages/
│               └── addressesErrorMessages.ar.ts      # Address Arabic error dictionary
│
└── app/
    ├── _layout.tsx                                   # Exports ErrorBoundary, awaits cart hydration
    ├── checkout.tsx                                  # Unknown write outcome dialog, revalidation integration
    ├── (customer)/
    │   ├── orders/
    │   │   ├── index.tsx                             # Arabic error dictionary usage
    │   │   └── [id].tsx                              # Arabic error dictionary usage
    │   └── profile.tsx                               # Arabic error dictionary usage
    └── (driver)/
        ├── active-order.tsx                          # Arabic error dictionary usage
        ├── available-orders/
        │   ├── index.tsx                             # Unknown outcome & active order detection
        │   └── [id].tsx                              # Arabic error dictionary usage
        └── history/
            ├── index.tsx                             # Arabic error dictionary usage
            └── [id].tsx                              # Arabic error dictionary usage
```

---

## Complexity Tracking

> **Constitution check passed with zero violations. No unjustified complexity introduced.**

| Area | Decision | Justification |
|---|---|---|
| Error Mapping | Static pure functions & dictionaries | Avoids heavyweight i18n libraries while preserving 100% type safety and future localization readiness |
| Realtime Reconnect | Channel status callback + query invalidation | Uses built-in Supabase Realtime channel status listener without extra WebSocket polling libraries |
| Boundary Isolation | React Native standard primitives with system fonts | Eliminates recursive render crashes when theme, font, or state providers fail |
| Revalidation | Reuses existing product repository catalog query | Avoids building duplicate batch RPCs or modifying existing database schemas |
