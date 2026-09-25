# Data Model: Driver Fulfillment (Amended)

**Feature**: Driver Fulfillment  
**Branch**: `003-driver-fulfillment`  
**Date**: 2026-09-20 (Amended)  
**Status**: Completed

---

## 1. Entity Overview & Domain Model

In accordance with Clean Architecture (Principle II) and Screaming Architecture (Principle I), domain entities are expressed as pure TypeScript interfaces with no infrastructure dependencies.

### 1.1 Driver Profile Entity (Harmonized)

**Location**: `src/features/drivers/domain/entities/DriverProfile.ts`

Uses the live `public.driver_profiles` table as the single source of truth for driver availability. `UserProfile` in the profile feature remains unchanged.

```typescript
export interface DriverProfile {
  id: string;
  userId: string;
  vehicleType: string | null;
  licensePlate: string | null;
  isAvailable: boolean;        // Live single source of truth (defaults to false)
  currentOrderId: string | null; // Tracks active delivery pointer
  createdAt: string;
  updatedAt: string;
}
```

### 1.2 Available Order Preview (Pre-Acceptance Projection)

**Location**: `src/features/drivers/domain/entities/AvailableOrderPreview.ts`

Privacy-safe projection of an unclaimed order. Does NOT contain customer street address, apartment number, or customer telephone (FR-004). Uses the store's public address/neighbourhood instead of leaking customer address labels.

```typescript
export interface AvailableOrderPreview {
  id: string;
  storeName: string;
  storeNeighbourhood: string;  // Store neighbourhood/street from public.restaurants.address
  itemCount: number;           // Total count of order items
  createdAt: string;           // ISO 8601 timestamp
}
```

### 1.3 Driver Order Interaction Entity

**Location**: `src/features/drivers/domain/entities/DriverOrderInteraction.ts`

Captures driver actions on orders that do not alter the order's primary status (declining an unclaimed order) or that need an audit trail (releasing an active order with a reason).

```typescript
export type InteractionType = 'declined' | 'released';

export interface DriverOrderInteraction {
  id: string;
  driverId: string;
  orderId: string;
  interactionType: InteractionType;
  reason: string | null;       // Mandatory for 'released', null for 'declined'
  createdAt: string;
}
```

### 1.4 Delivery History Entry

**Location**: `src/features/drivers/domain/entities/DeliveryHistoryEntry.ts`

Assembled via `SECURITY DEFINER` RPC to provide a complete view of completed, declined, released, and cancelled orders.

```typescript
export type HistoryStatus = 'completed' | 'declined' | 'released' | 'cancelled';

export interface DeliveryHistoryEntry {
  id: string;
  orderId: string;
  storeName: string;
  orderDate: string;           // ISO 8601
  finalStatus: HistoryStatus;
  releaseReason: string | null; // Displayed for 'released' orders
}
```

---

## 2. Relational Database Schema & Migrations

### 2.1 Schema Integrity: No Redundant Alterations
- **NO `profiles.is_available`**: Dropped. `driver_profiles.is_available` is already live.
- **NO `orders.delivery_zone`**: Dropped. Store neighbourhood from `restaurants.address` is used for MVP simplicity.

### 2.2 New Table: `driver_order_interactions`

```sql
CREATE TABLE IF NOT EXISTS public.driver_order_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('declined', 'released')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT doi_release_requires_reason CHECK (
    interaction_type != 'released' OR (reason IS NOT NULL AND TRIM(reason) != '')
  )
);

-- Partial unique index: a driver can only decline an order once.
-- Releases are NOT constrained here, allowing repeat releases if an order is re-accepted.
CREATE UNIQUE INDEX IF NOT EXISTS doi_unique_decline
  ON public.driver_order_interactions(driver_id, order_id)
  WHERE interaction_type = 'declined';

CREATE INDEX IF NOT EXISTS doi_driver_idx ON public.driver_order_interactions(driver_id);
CREATE INDEX IF NOT EXISTS doi_order_idx ON public.driver_order_interactions(order_id);
```

### 2.3b Pool Signal Table: `driver_pool_signals` (T045 remediation)

Supabase Realtime enforces RLS on `postgres_changes` subscriptions. Drivers cannot SELECT pending order rows (`driver_id IS NULL` under `orders_customer_or_driver_select`), so a subscription on `orders` never fires for pool changes; granting drivers row access would instead leak the customer's `delivery_address` (FR-004). The signal table carries ONLY an opaque order id — no PII — so its "all authenticated may read" policy leaks nothing, and the client refetches the pool via `get_available_orders()`, keeping the privacy-safe projection as the single data path.

```sql
CREATE TABLE public.driver_pool_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  signal TEXT NOT NULL CHECK (signal IN ('order_added', 'order_claimed', 'order_released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.driver_pool_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY dps_authenticated_select ON public.driver_pool_signals
  FOR SELECT TO authenticated USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.driver_pool_signals;
```

Emission is handled by the `emit_driver_pool_signal` AFTER INSERT OR UPDATE trigger on `orders`: INSERT with status `pending` → `order_added`; `pending → accepted` (claim) → `order_claimed` (prior signals for the order are pruned); active → `pending` (release) → `order_released`.

### 2.3 Row Level Security on `driver_order_interactions`

```sql
ALTER TABLE public.driver_order_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY driver_interactions_select ON public.driver_order_interactions
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());
```

---

## 3. Order Lifecycle State Transitions & Triggers

### 3.1 Fulfillment Progression Flow

```
[pending] ──(claim_order)──→ [accepted]
    ↑                             │
    │                       (store prepares)
    │                             ↓
    │                        [preparing]
    │                             │
    │                       (driver en route)
    │                             ↓
    │                       [out_for_delivery]
    │                             │
    │                       (order completed)
    │                             ↓
    │                        [delivered] (terminal)
    │
    └──(release_order with GUC escape)──┘
       Order reverts to pending (driver_id = NULL)
       driver_profiles.current_order_id set to NULL
       Release logged in driver_order_interactions
```

### 3.2 Trigger Coordination & Maintenance Escape

1. **`orders_column_guard` Trigger**:
   - Allows direct updates to: `status`, `updated_at`, `accepted_at`, `delivered_at`.
   - Rejects direct changes to `driver_id` unless `app.order_maintenance = 'on'`.
   - **`claim_order`**: Sets `app.order_maintenance = 'on'` internally.
   - **`advance_order_status`**: Changes `status` only; does NOT touch `driver_id` -> runs without GUC escape.
   - **`release_order`**: Clears `driver_id = NULL` -> sets `app.order_maintenance = 'on'` internally.

2. **`validate_order_transition` Trigger Update**:
   - Live trigger strictly enforces forward lifecycle transitions (`accepted -> preparing -> out_for_delivery -> delivered`).
   - Must be updated in Migration 2 to bypass transition check when `app.order_maintenance = 'on'` so `release_order` can revert an active order back to `pending`.
   - **Scope warning (review remediation)**: the maintenance bypass is deliberately scoped to `claim_order` and `release_order` ONLY. Any future `SECURITY DEFINER` function that sets `app.order_maintenance = 'on'` must independently guarantee it performs only already-validated transitions, because the trigger provides no transition or column protection while the GUC is set.

3. **`driver_profiles.current_order_id` Pointer Management**:
   - `claim_order`: Sets `current_order_id = p_order_id`.
   - `release_order`: Explicitly resets `current_order_id = NULL`.
   - Terminal status (`delivered`): Cleared by `sync_driver_current_order` trigger.

---

## 4. Validation Rules Summary

| Rule | Enforcement | Mechanism |
|---|---|---|
| Driver must be Available to view/claim | Database predicate | `EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = auth.uid() AND is_available)` |
| Offline returns empty pool | Query logic | `get_available_orders` returns `[]` when offline |
| One active delivery per driver | Server-side RPC | `claim_order` validates `NOT EXISTS active orders` |
| Atomic claiming race condition | Server-side RPC | `claim_order` UPDATE with row-level lock |
| Strict sequential advancement | Server-side RPC + Trigger | `advance_order_status` + `validate_order_transition` |
| Release requires mandatory reason | Database constraint + RPC | `doi_release_requires_reason` + `release_order` check |
| Release resets driver pointer | Server-side RPC | `release_order` updates `driver_profiles.current_order_id = NULL` |
| Repeat releases allowed | Partial unique index | Unique index covers only `interaction_type = 'declined'` |
| Customer privacy pre-acceptance | Query projection | `get_available_orders` exposes only store info and item count |
| Driver history includes released orders | SECURITY DEFINER RPC | `get_driver_history` queries past orders even when `orders.driver_id = NULL` |
