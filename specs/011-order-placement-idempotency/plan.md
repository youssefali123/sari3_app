# Implementation Plan: Order Placement Idempotency

**Branch**: `011-order-placement-idempotency` | **Date**: 2026-10-19 | **Spec**: [specs/011-order-placement-idempotency/spec.md](spec.md)

**Input**: Feature specification from `specs/011-order-placement-idempotency/spec.md` and design requirements in `mds/order-placement-idempotency.md`.

---

## Summary

Implement robust, end-to-end idempotency for order placement to eliminate duplicate orders and duplicate coupon redemptions caused by double taps, lost network responses, or app restarts mid-flight.
- **Server**: Extend `public.orders` with `idempotency_key uuid` and a unique index on `(customer_id, idempotency_key)`. Update `place_order(p_payload jsonb)` to require `idempotency_key`, serialize concurrent attempts using PostgreSQL transaction advisory locks, and return the existing order upon key replay without re-running pricing, coupon redemptions, or notifications. Guard `idempotency_key` against mutation via `orders_column_guard()`.
- **Client**: Implement a pure Application-layer intent resolver with deterministic cart fingerprinting. Lazily generate and persist `{ idempotencyKey, intentFingerprint }` in Redux and `AsyncStorage` alongside the shopping cart. Reuse the key on retries with identical purchase intent, rotate to a fresh key if cart/address details change, and clear it only upon confirmed success. Add a synchronous ref guard on checkout confirmation and configure `mutations: { retry: 0 }` in TanStack Query.

---

## Technical Context

**Language/Version**: TypeScript 5.x (Strict mode) / PostgreSQL 17 (PL/pgSQL)

**Primary Dependencies**:
- Mobile: React Native, Expo SDK 57, `@reduxjs/toolkit`, `@tanstack/react-query`, `@supabase/supabase-js`, `expo-crypto`, `@react-native-async-storage/async-storage`
- Backend: Supabase Postgres, `pg_advisory_xact_lock`, PL/pgSQL triggers

**Storage**:
- Server: PostgreSQL `public.orders` (with unique index `orders_customer_idempotency_idx`)
- Client: `@react-native-async-storage/async-storage` (`@sari3_cart_storage_v1`)

**Testing**:
- Unit Tests: Jest for `checkoutIntentResolver.ts` and `cartSlice.ts`
- Live Database Tests: Transactional SQL scripts with rollback for sequential replay, concurrency race, and missing key validation

**Target Platform**: iOS and Android (Expo SDK 57)

**Project Type**: Mobile application + Supabase Backend

**Performance Goals**:
- Idempotent replay response resolved in < 50ms at database level (bypassing price & coupon validation)
- Overall checkout submission and recovery in < 2s

**Constraints**:
- Zero Expo, Supabase, React Native, or AsyncStorage imports in Domain/Application layers
- Database-level atomicity (Principle VI)
- Preserve exact existing `place_order(p_payload jsonb)` signature (no overloads)
- No separate idempotency table

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Plan Alignment | Status |
|---|---|---|---|
| **I. Feature-First Structure** | Organize by capability | Files stay within `src/features/cart/`, `src/features/orders/`, and `src/app/checkout.tsx` | **PASS** |
| **II. Lightweight Clean Architecture** | Clean layer separation; Domain/Application free of platform imports | `checkoutIntentResolver.ts` is pure TypeScript; UUID generator injected at presentation boundary | **PASS** |
| **III. Fixed Dependency Direction** | Presentation → Application → Domain ← Infrastructure | Repositories implement Domain interfaces; Presentation invokes Application resolvers | **PASS** |
| **IV. State Ownership** | Redux for client state, TanStack Query for server state | Redux stores client intent key/fingerprint; TanStack Query owns server order caching | **PASS** |
| **V. Server Authority** | Database enforces rules and pricing | Postgres RPC owns uniqueness constraint, concurrency lock, and replay response | **PASS** |
| **VI. Atomic Concurrency** | Concurrency-critical writes atomic in DB | Handled via `pg_advisory_xact_lock(hashtext(customer_id), hashtext(idempotency_key))` + unique index | **PASS** |
| **VII. Historical Record Immutability** | Snapshots immutable | `orders_column_guard` updated to ensure `idempotency_key` cannot be altered | **PASS** |
| **VIII. Realtime/Push Decoupled** | Notifications decoupled from business logic | Replay bypasses order inserts; triggers fire zero duplicate push/pool signals | **PASS** |
| **X. Practical MVP Simplicity** | Avoid unnecessary abstractions | No separate idempotency table; column added directly to `orders` | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/011-order-placement-idempotency/
├── spec.md                  # Feature requirements and user stories
├── plan.md                  # This file
├── research.md              # Architectural decisions and trade-offs
├── data-model.md            # Schema extensions and TypeScript entities
├── quickstart.md            # Live verification and testing guide
├── checklists/
│   └── requirements.md      # Specification quality checklist
└── contracts/
    ├── place_order_rpc.md   # Supabase place_order RPC contract
    └── checkout_intent_resolver.md # Application intent resolver contract
```

### Source Code Modifications

```text
supabase/migrations/
└── <timestamp>_add_order_placement_idempotency.sql
    ├── Column addition: orders.idempotency_key uuid
    ├── Index: orders_customer_idempotency_idx
    ├── Trigger update: orders_column_guard() immutability check
    └── RPC update: CREATE OR REPLACE FUNCTION public.place_order(p_payload jsonb)

src/
├── features/
│   ├── cart/
│   │   ├── domain/
│   │   │   └── entities/
│   │   │       └── CheckoutIntent.ts              # Intent types & interfaces
│   │   ├── application/
│   │   │   ├── checkoutIntentResolver.ts          # Pure fingerprinting & key rotation logic
│   │   │   ├── cartSlice.ts                       # Redux state & reducers for checkoutIntent
│   │   │   └── __tests__/
│   │   │       └── checkoutIntentResolver.test.ts # Unit tests for key lifecycle
│   ├── orders/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── Order.ts                       # Added idempotencyKey?: string | null
│   │   │   └── repositories/
│   │   │       └── OrderRepository.ts             # PlaceOrderInput: idempotencyKey: string
│   │   └── infrastructure/
│   │       └── SupabaseOrderRepository.ts         # Passes idempotency_key in p_payload
├── app/
│   └── checkout.tsx                               # Synchronous in-flight guard, intent resolution
└── shared/
    └── lib/
        ├── queryClient.ts                         # mutations: { retry: 0 }
        └── store.ts                               # AsyncStorage serialization of checkoutIntent
```

---

## Complexity Tracking

> **Constitution check passed with zero violations. No unjustified complexity introduced.**

| Area | Decision | Justification |
|---|---|---|
| Storage | Nullable column on `orders` | Avoids a second table, saves joins, and natively handles legacy orders |
| Concurrency | `pg_advisory_xact_lock` | Standard PostgreSQL pattern for serialization; releases automatically on transaction termination |
| Client | Pure resolver + injected UUID | Keeps Application layer 100% free of Expo/Hermes platform dependencies |
