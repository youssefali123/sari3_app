# Implementation Plan: Order Cancellation & Expiration

**Branch**: `005-order-cancellation-expiration` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-order-cancellation-expiration/spec.md`, project structure from `mds/Project_Structure.md`, live schema inspections, and project constitution (`.specify/memory/constitution.md` v1.1.0).

---

## Summary

Implement customer self-service order cancellation across pre-delivery lifecycle states (`pending`, `accepted`, `preparing`, `out_for_delivery`), automatic server-side expiration of stale pending orders after 30 minutes, real-time driver pool removal, actor-aware push alerts without self-echoes, customer order history soft-hiding, and catalog-revalidated "Order Again" reordering in the Sari3 delivery application.

Key implementation pillars:
1. **Server-Authoritative Cancellation RPC (`cancel_order`)**:
   - Single atomic entry point for customer cancellation. Enforces ownership (`customer_id = auth.uid()`), validates lifecycle eligibility, sets transaction-scoped actor GUC (`app.cancellation_actor = 'customer'`), updates status to `cancelled`, and immediately clears `driver_profiles.current_order_id = NULL` for assigned drivers.
   - Drops legacy client direct-update policy (`DROP POLICY IF EXISTS orders_update_own_customer_cancel ON public.orders;`).
2. **PostgreSQL Enum Extension & Migration Sequencing**:
   - Adds distinct 8th status `'expired'` to `public.order_status` in an isolated initial migration (`20260925000001_add_expired_order_status.sql`) to guarantee PostgreSQL transaction isolation compliance.
   - Main migration (`20260925000002_order_cancellation_expiration.sql`) implements all table alterations, functions, triggers, and RPCs.
3. **Database Trigger Reopening (`validate_order_transition`) & Parity**:
   - Updates `validate_order_transition()` to allow transitions: `pending -> (accepted, cancelled, rejected, expired)`, `accepted -> (preparing, cancelled)`, `preparing -> (out_for_delivery, cancelled)`, `out_for_delivery -> (delivered, cancelled)`. Terminal states remain default-denied.
   - Updates client-side domain entity `OrderStatus.ts` with `OrderStatus.Expired` and identical `VALID_TRANSITIONS` for strict 1:1 parity.
4. **Order Expiration Mechanism & Race Protection**:
   - Centralizes TTL definition in `public.pending_order_ttl() RETURNS interval` (returning `interval '30 minutes'`).
   - Implements automated batch worker `public.expire_stale_orders() RETURNS jsonb` scheduled via `pg_cron` every minute.
   - Hardens `claim_order` with an atomic age check (`created_at >= (now() - public.pending_order_ttl())`) to prevent phantom claims even if the cron job is delayed.
   - Filters stale orders from `get_available_orders()` and broadcasts real-time pool removal via `emit_driver_pool_signal()`.
5. **Actor-Aware Push Notifications & Driver Dispatch**:
   - Updates `public.notification_events` with new event types: `order_cancelled_by_customer` and `order_expired`.
   - In `enqueue_order_notification()`: suppresses customer push alert on self-cancellation (`app.cancellation_actor = 'customer'`), and emits `order_cancelled_by_customer` to the assigned driver.
   - Updates Edge Function `notify-order-status` to target the assigned driver exclusively for `order_cancelled_by_customer` with localized Arabic/English templates.
6. **Order History Soft-Hiding**:
   - Adds `customer_hidden_at TIMESTAMPTZ DEFAULT NULL` to `public.orders` with partial index.
   - Implements `public.hide_order(p_order_id UUID)` RPC (`SECURITY DEFINER`).
   - Filters hidden orders in `SupabaseOrderRepository.getCustomerOrders(customerId)` while preserving deep-link lookups in `getOrderById(id)`.
   - Never deletes rows, items, or snapshots (Principle VII).
7. **Catalog-Revalidated "Order Again"**:
   - Application hook `useReorder` revalidates historical snapshot items against live store products and add-ons, recomputes prices, flags discontinued items, handles single-store cart conflicts via Redux `cartSlice`, and navigates to checkout for explicit user confirmation.
8. **Resilient Driver Status Advancement**:
   - Hardens `advance_order_status` with `AND status = v_current_status` to return a handled status code instead of throwing trigger exceptions when concurrent customer cancellations occur.
   - Driver UI smoothly reflects the cancellation banner and releases local tracking.

---

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode `strict: true`), React 19.2.3, React Native 0.86.3

**Primary Dependencies**:
- Expo SDK 57 (`~57.0.20`), Expo Router (`~57.0.19`)
- Supabase JS (`^2.116.0`) for database RPCs, Realtime channels, and authentication
- TanStack Query v5 (`^5.102.8`) for all server state (orders, active order, pool, history)
- Redux Toolkit (`^2.12.0`) for client-local state (cart contents, single-store conflict modal)
- `expo-network` (`~57.0.2`) for driver offline status detection
- `expo-notifications` (`~57.0.18`) for push notification tokens and handling
- `@react-native-async-storage/async-storage` (`2.2.0`) for auth token persistence

**Storage Architecture**:
- **Supabase PostgreSQL**:
  - Live tables: `orders` (amended with `customer_hidden_at`), `order_items`, `driver_profiles`, `driver_pool_signals`, `notification_events` (amended with new check constraint).
  - Enums: `order_status` (amended with `'expired'`).
  - Stored Procedures (RPCs): `cancel_order`, `expire_stale_orders`, `hide_order`, `pending_order_ttl`, updated `claim_order`, updated `advance_order_status`, updated `get_available_orders`.
  - Database Triggers: updated `validate_order_transition`, updated `emit_driver_pool_signal`, updated `enqueue_order_notification`.
  - Scheduled Jobs: `pg_cron` schedule `expire_stale_orders_job` running every minute.
- **Edge Functions**:
  - `notify-order-status`: Updated to process `order_cancelled_by_customer` (targeted to assigned driver) and `order_expired` (targeted to customer) with English and Arabic localization.
- **TanStack Query Cache**:
  - Customer order cache: `['orders', customerId]`, `['order', orderId]`.
  - Driver order cache: `['driver', 'activeOrder']`, `['driver', 'availableOrders']`, `['driver', 'history']`.

**Testing Strategy**:
- TypeScript strict type verification (`npx tsc --noEmit`).
- Expo linting verification (`npm run lint`).
- Database migration execution and RPC verification scenarios in `quickstart.md`.
- End-to-end manual validation covering all 7 spec user stories and edge cases.

**Constraints & Performance Goals**:
- Cancellation confirmation in < 1.5s under normal network conditions (SC-001).
- Real-time pool removal < 1s across connected driver devices (SC-002).
- Zero customer self-echo push alerts (SC-004).
- 100% of unclaimed orders > 30m prevented from being claimed (SC-005).
- Zero physical deletions for hidden orders (SC-007).
- 100% of "Order Again" actions require explicit customer checkout confirmation (SC-008).

---

## Constitution Check

*GATE: Evaluated against Constitution v1.1.0 principles.*

| Principle | Requirement | Compliance Analysis | Status |
|---|---|---|---|
| **I. Feature-First Structure** | Code organized by business capability (`src/features/orders/`, `src/features/drivers/`, `src/features/cart/`). | Order cancellation, hiding, and reorder domain logic resides in `src/features/orders/`. Driver-facing components in `src/features/drivers/`. Cart modifications in `src/features/cart/`. Routes remain in file-based route groups `(customer)/orders` and `(driver)/active-order`. | **PASS** |
| **II. Lightweight Clean Architecture** | Pure TS Domain, Application hooks, Infrastructure Supabase/Expo clients, Presentation components. | `OrderRepository`, `OrderStatus`, and `NotificationEventType` are pure TS without framework dependencies. Supabase RPC calls isolated in `SupabaseOrderRepository`. UI consumes domain models via hooks. | **PASS** |
| **III. Dependency Direction** | Presentation → Application → Domain ← Infrastructure | Domain defines interfaces (`OrderRepository`); Infrastructure implements them (`SupabaseOrderRepository`); Application hooks (`useReorder`) and Presentation components consume Domain interfaces. | **PASS** |
| **IV. State Ownership** | TanStack Query owns server state; Redux owns cart only; Context owns auth session. | Order data, pool, active order, and driver history owned exclusively by TanStack Query. Realtime events trigger cache invalidation. Redux manages only client cart items and the conflict modal. | **PASS** |
| **V. Server Is Final Authority** | Security, roles, pricing, and state transitions authoritative in PostgreSQL. | `cancel_order`, `expire_stale_orders`, `hide_order`, `claim_order`, and `advance_order_status` are PostgreSQL `SECURITY DEFINER` RPCs enforcing ownership, roles, and state transitions. Direct client write policies on orders status remain completely blocked. | **PASS** |
| **VI. Atomic Concurrency Writes** | Concurrency-critical writes atomic at database level. | `cancel_order`, `claim_order`, and `advance_order_status` execute conditional `UPDATE` statements within single atomic database transactions, preventing double-claims and advance-after-cancel race conditions. | **PASS** |
| **VII. Historical Records Immutable** | Historical orders snapshot records at transaction time; no physical deletions. | `hide_order` soft-hides via `customer_hidden_at` and never deletes rows or snapshots. "Order Again" revalidates current menu and never modifies past order snapshots. | **PASS** |
| **VIII. Realtime & Push Separate** | In-app realtime separate from push, hidden behind Domain services. | Live screen updates driven by Supabase Realtime subscriptions in `OrderRealtimeService` and `DriverRealtimeService`. Background push alerts routed via `notification_events` and Expo Push API. | **PASS** |
| **IX. Deferred Scope Extensible** | Architecture allows future payment refunds, admin cancellations without rewrites. | Cancellation actor GUC pattern preserves non-customer cancellation branches for future restaurant/admin portals. Cash-on-delivery remains clean abstraction. | **PASS** |
| **X. Practical MVP Simplicity** | Pragmatic feature-sliced implementation; avoid premature abstractions. | Reuses existing tables and RPC infrastructure; adds single column `customer_hidden_at`; reuses existing `StoreConflictModal` for reorder conflict prompts; avoids complex workflow engines. | **PASS** |

**Gate Result**: ✅ **ALL CONSTITUTIONAL GATES PASS**

---

## Project Structure

### Documentation (this feature)

```text
specs/005-order-cancellation-expiration/
├── spec.md                  # Feature specification
├── research.md              # Phase 0 architectural research & decisions
├── data-model.md            # Phase 1 data model, schemas, and lifecycle state machines
├── quickstart.md            # Phase 1 runnable validation scenarios & test guide
├── contracts/
│   ├── database-rpc.md        # Stored procedures, triggers & SQL contracts
│   └── domain-repositories.md # TypeScript repository & client interface contracts
└── plan.md                  # This implementation plan
```

### Source Code Changes & Structure

```text
supabase/
├── migrations/
│   ├── 20260925000001_add_expired_order_status.sql        # Migration A: Add 'expired' enum value
│   └── 20260925000002_order_cancellation_expiration.sql   # Migration B: Tables, triggers, RPCs, pg_cron
└── functions/
    └── notify-order-status/
        └── index.ts                                       # Edge Function: order_cancelled_by_customer, order_expired

src/
├── app/
│   ├── (customer)/
│   │   └── orders/
│   │       ├── [id].tsx                                   # Customer Order Details: Cancel Order button, Order Again button
│   │       └── index.tsx                                  # Customer Order History: Hide Order action, Order Again
│   └── (driver)/
│       └── active-order.tsx                               # Driver Active Order: Cancelled notice banner & pool recovery
├── features/
│   ├── cart/
│   │   ├── application/
│   │   │   └── cartSlice.ts                               # Redux: batch add & reorder conflict support
│   │   └── presentation/
│   │       └── StoreConflictModal.tsx                     # Reused for batch reorder conflict prompt
│   ├── drivers/
│   │   ├── application/
│   │   │   └── hooks/
│   │   │       └── useActiveOrder.ts                      # Driver hook: handle ORDER_STATUS_CHANGED gracefully
│   │   ├── domain/
│   │   │   └── repositories/
│   │   │       └── DriverFulfillmentRepository.ts         # Updated advanceOrderStatus return signature
│   │   ├── infrastructure/
│   │   │   └── SupabaseDriverFulfillmentRepository.ts     # Implementation of updated advanceOrderStatus
│   │   └── presentation/
│   │       └── components/
│   │           └── ActiveOrderCard.tsx                    # Display "Customer cancelled this order" notice
│   ├── notifications/
│   │   └── domain/
│   │       └── entities/
│   │           └── NotificationEventType.ts               # Added OrderCancelledByCustomer, OrderExpired
│   └── orders/
│       ├── application/
│       │   └── hooks/
│       │       └── useReorder.ts                          # New hook: Catalog revalidation, price check & staging
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── Order.ts                               # Added customerHiddenAt field
│       │   │   └── OrderStatus.ts                         # Added Expired enum value & updated VALID_TRANSITIONS
│       │   └── repositories/
│       │       └── OrderRepository.ts                     # Added cancelOrder and hideOrder signatures
│       ├── infrastructure/
│       │   └── SupabaseOrderRepository.ts                 # Implemented cancelOrder, hideOrder, getCustomerOrders filter
│       └── presentation/
│           └── OrderSummaryCard.tsx                       # Added status badge for Expired, Hide and Order Again buttons
```

**Structure Decision**: Fully adheres to screaming architecture (Principle I) and lightweight clean architecture per feature (Principle II). Extends existing capability folders (`orders`, `drivers`, `cart`, `notifications`) without introducing new horizontal layers or unnecessary abstractions.

---

## Complexity Tracking

*No constitutional violations identified. All gates pass unconditionally.*
