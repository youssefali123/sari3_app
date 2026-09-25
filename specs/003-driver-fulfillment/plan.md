# Implementation Plan: Driver Fulfillment (Amended)

**Branch**: `003-driver-fulfillment` | **Date**: 2026-09-20 (Amended) | **Spec**: [spec.md](file:///home/youssef/Desktop/sari3-app/sari3_speckit/sari3_app2/specs/003-driver-fulfillment/spec.md)

**Input**: Feature specification from `specs/003-driver-fulfillment/spec.md`, project structure from `mds/Project_Structure.md`, live schema inspections, and project constitution (`.specify/memory/constitution.md` v1.1.0).

---

## Summary

Implement the end-to-end driver fulfillment experience in the Sari3 delivery application, fully reconciling with the live database schema and active trigger guards.

Key implementation pillars:
1. **Single Source of Truth for Availability**: Reuses existing `public.driver_profiles.is_available` (default `false`, existing own-row RLS). The `toggle_driver_availability` RPC updates `driver_profiles.is_available`. `UserProfile` in the profile feature is not modified.
2. **Reuse Hardened `claim_order` RPC**: Reuses the production-tested `public.claim_order(p_order_id, p_driver_id)` RPC with self-claim checks, role validation, single-active-delivery enforcement, and the transaction-scoped `app.order_maintenance` GUC escape required by the `orders_column_guard` trigger. No redundant `accept_order` RPC is created.
3. **Trigger-Safe Order Release (`release_order`)**: Implements `release_order(p_order_id, p_reason)` with dual GUC escape (`app.order_maintenance = 'on'`) to safely bypass both the `orders_column_guard` trigger and the `validate_order_transition` trigger. Reverts the order to `pending` with `driver_id = NULL` and `accepted_at = NULL`, explicitly resets `driver_profiles.current_order_id = NULL` to prevent stale pointers, and records the mandatory release reason in `driver_order_interactions`.
4. **Repeat Releases Allowed via Partial Unique Index**: Scopes interaction uniqueness to declines only (`CREATE UNIQUE INDEX doi_unique_decline ON driver_order_interactions(driver_id, order_id) WHERE interaction_type = 'declined'`), allowing repeat releases if an order is re-accepted and released again.
5. **Pre-Acceptance Privacy via Store Neighbourhood**: Previews display the store's neighbourhood (from public `restaurants.address`) and item count. Skips creating a redundant, semantically inaccurate `orders.delivery_zone` column from customer address labels.
6. **Active Order Retrieval via Standard RLS Query**: Employs a direct TanStack Query against `orders` with `orders_customer_or_driver_select` RLS, omitting unnecessary RPC wrappers per Principle X (Practical MVP Simplicity).
7. **Delivery History via `SECURITY DEFINER` RPC**: Assembles completed, declined, released, and cancelled orders inside `get_driver_history()`. This is strictly required because released orders have `driver_id = NULL` and are hidden by standard orders RLS from the driver who released them. A cancelled order appears only for drivers who previously interacted with it (declined it while pending, or accepted-then-released it) — US5-AS3 / ambiguity A1 resolution (review remediation).
8. **Graceful Offline Order Pool**: When a driver is offline, `get_available_orders` returns an empty array `[]` instead of raising an error, avoiding error-driven UI control flow.
9. **Strict Sequential Lifecycle Progression**: The no-parameter `advance_order_status(p_order_id)` stepper advances orders (`accepted -> preparing -> out_for_delivery -> delivered`). Status is guard-allowlisted, so it executes cleanly through live triggers without maintenance GUCs.
10. **Proactive Network Connectivity Guard**: Installs `expo-network` (`~7.0.5`), displays an `OfflineNoticeBanner`, and aborts driver actions during disconnections (no silent or optimistic writes).
11. **Driver Route Group Protection**: Enforces driver role checks in `(driver)/_layout.tsx`, redirecting unauthorized users.

---

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode `strict: true`), React 19.2.3, React Native 0.86.3

**Primary Dependencies**:
- Expo SDK 57 (`~57.0.20`), Expo Router (`~57.0.19`)
- Supabase JS (`^2.116.0`) for database RPCs, Realtime channels, and authentication
- TanStack Query v5 (`^5.102.8`) for all server state (available orders, active order, history, availability)
- `expo-network` (`~7.0.5`) — **Explicit new dependency to install**
- `@react-native-async-storage/async-storage` (`2.2.0`) for auth token persistence

**Storage Architecture**:
- **Supabase PostgreSQL**: Live tables `orders`, `order_items`, `profiles`, `driver_profiles`, and new table `driver_order_interactions`.
- **Database Functions (RPCs)**:
  - Existing: `claim_order(p_order_id, p_driver_id)` (reused as-is).
  - New: `toggle_driver_availability(p_is_available)`, `get_available_orders()`, `decline_order(p_order_id)`, `advance_order_status(p_order_id)`, `release_order(p_order_id, p_reason)`, `get_driver_history()`.
- **Database Triggers**:
  - `orders_column_guard`: Guards columns from direct client updates; bypassed via `app.order_maintenance = 'on'`.
  - `validate_order_transition`: Amended in Migration 2 to allow maintenance bypass when reverting on release.
- **TanStack Query Cache**: Manages queries for available orders (`['driver', 'availableOrders']`), active order (`['driver', 'activeOrder']`), delivery history (`['driver', 'history']`), and availability (`['driver', 'availability']`).

**Testing Strategy**:
- TypeScript strict type verification (`npx tsc --noEmit`).
- Expo linting verification (`npm run lint`).
- Database migration execution and RPC verification scenarios in `quickstart.md`.
- 10 comprehensive manual verification scenarios covering all 8 spec user stories and edge cases.

**Constraints**:
- Single active order per driver (enforced by DB index and RPC).
- No GPS tracking or live distance calculation (Principle IX).
- Zero optimistic mutation writes during offline state (FR-016).
- Customer address and phone strictly hidden prior to order acceptance (FR-004).

---

## Constitution Check

*GATE: Evaluated against Constitution v1.1.0 principles.*

| Principle | Requirement | Compliance Analysis | Status |
|---|---|---|---|
| **I. Feature-First Structure** | Code organized by business capability (`src/features/drivers/`, `src/features/orders/`). | Driver domain, application, infrastructure, and presentation components live strictly in `src/features/drivers/`. Routes live in `src/app/(driver)/`. | **PASS** |
| **II. Lightweight Clean Architecture** | Pure TS Domain, Application hooks, Infrastructure Supabase/Expo clients, Presentation components. | Domain repositories (`DriverFulfillmentRepository`) and entities (`AvailableOrderPreview`, `DeliveryHistoryEntry`) are pure TS interfaces without external imports. | **PASS** |
| **III. Dependency Direction** | Presentation → Application → Domain ← Infrastructure | Domain defines contracts; Infrastructure implements them; Presentation/Application consume Domain interfaces. | **PASS** |
| **IV. State Ownership** | TanStack Query owns server state; Redux owns cart only; Context owns auth session. | Driver orders, active order, history, and availability owned entirely by TanStack Query. Realtime triggers cache invalidation. No driver state in Redux. | **PASS** |
| **V. Server Is Final Authority** | Security, roles, and state transitions authoritative in PostgreSQL. | `claim_order`, `advance_order_status`, `release_order`, and `toggle_driver_availability` enforce driver role and status validity in PostgreSQL `SECURITY DEFINER` RPCs. | **PASS** |
| **VI. Atomic Concurrency Writes** | Concurrency-critical writes atomic at database level. | Reuses hardened `claim_order` with conditional row lock (`UPDATE ... WHERE driver_id IS NULL AND status = 'pending'`). | **PASS** |
| **VII. Historical Records Immutable** | Historical orders snapshot records at transaction time. | Order items and address snapshots remain immutable. Driver interactions logged in `driver_order_interactions` with reasons. | **PASS** |
| **VIII. Realtime & Push Separate** | In-app realtime separate from push, hidden behind Domain services. | `DriverRealtimeService` abstracts Supabase Realtime channel subscriptions away from presentation components. | **PASS** |
| **IX. Deferred Scope Extensible** | Architecture allows future GPS tracking, live routing, ratings without rewrites. | Orders display store neighbourhood from public store catalog; domain repository interfaces ready for future location coordinates without breaking changes. | **PASS** |
| **X. Practical MVP Simplicity** | Pragmatic feature-sliced implementation; avoid premature abstractions. | Reuses live `claim_order`, drops redundant `get_driver_active_order` RPC, avoids unnecessary `orders` table alterations, handles offline pool with empty array. | **PASS** |

**Gate Result**: ✅ **ALL CONSTITUTIONAL GATES PASS**

---

## Project Structure

### Documentation (this feature)

```text
specs/003-driver-fulfillment/
├── spec.md              # Feature specification
├── research.md          # Architectural research & decisions (Amended)
├── data-model.md        # Entities, schema changes, RLS, and lifecycle transitions (Amended)
├── quickstart.md        # Runnable verification and manual test guide (Amended)
├── contracts/
│   ├── database-rpc.md        # Stored procedures & SQL contracts (Amended)
│   └── domain-repositories.md # TypeScript repository & service interfaces (Amended)
└── plan.md              # This implementation plan (Amended)
```

### Source Code Reconciliation

Aligned with `mds/Project_Structure.md`:

#### 1. Existing and Reused (Unchanged)
```text
src/
├── app/
│   ├── (auth)/
│   └── (customer)/
├── features/
│   ├── addresses/
│   ├── auth/
│   ├── cart/
│   ├── favorites/
│   ├── orders/
│   ├── products/
│   ├── profile/
│   ├── promotions/
│   └── restaurants/
├── shared/
│   ├── lib/
│   ├── types/common.ts
│   ├── types/supabase.ts
│   ├── ui/
│   └── utils/
└── providers/AppProviders.tsx
```

#### 2. Existing and Modified
```text
src/
├── app/
│   └── (driver)/
│       ├── _layout.tsx                  # Add role verification, tab config, and OfflineNoticeBanner
│       ├── active-order.tsx             # Implement active order fulfillment UI & lifecycle stepper
│       ├── available-orders/
│       │   ├── index.tsx                # Implement available orders pool & availability toggle
│       │   └── [id].tsx                 # Implement unclaimed order preview detail
│       ├── history/
│       │   ├── index.tsx                # Implement delivery history list & status filtering
│       │   └── [id].tsx                 # Implement delivery history detail
│       └── profile.tsx                  # Implement driver profile, availability switch, and sign out
└── features/
    └── drivers/
        └── domain/
            └── entities/DriverProfile.ts # Verify alignment with live driver_profiles table
```

#### 3. Genuinely New
```text
src/features/drivers/
├── domain/
│   ├── entities/
│   │   ├── AvailableOrderPreview.ts     # Privacy-safe unclaimed order model
│   │   ├── DriverOrderInteraction.ts    # Model for declined & released actions
│   │   └── DeliveryHistoryEntry.ts      # Model for driver delivery history item
│   ├── repositories/
│   │   └── DriverFulfillmentRepository.ts# Repository contract for driver actions
│   └── services/
│       ├── DriverRealtimeService.ts     # Interface for pool & active order realtime updates
│       └── NetworkStatusService.ts      # Interface for connectivity status
├── infrastructure/
│   ├── SupabaseDriverFulfillmentRepository.ts # Concrete Supabase RPC implementation
│   ├── SupabaseDriverRealtimeService.ts       # Supabase Realtime channel implementation
│   └── ExpoNetworkStatusService.ts            # Expo Network connectivity implementation
├── application/
│   ├── hooks/
│   │   ├── useDriverAvailability.ts     # Query & mutation hook for online/offline toggle
│   │   ├── useAvailableOrders.ts        # Query hook for unclaimed orders pool with realtime
│   │   ├── useActiveOrder.ts            # Query hook for active order & mutation stepper
│   │   ├── useDriverHistory.ts          # Query hook for past fulfillment history
│   │   └── useNetworkStatus.ts          # Hook for reactive online/offline connectivity
└── presentation/
    └── components/
        ├── AvailabilityToggle.tsx       # Switch component for Available/Offline state
        ├── AvailableOrderCard.tsx       # Card rendering store, neighbourhood, item count
        ├── ActiveOrderCard.tsx          # Card with full address, items, and action stepper
        ├── DeliveryHistoryCard.tsx      # Card rendering past order with status badge & reason
        ├── OrderReleaseModal.tsx        # Modal prompting for mandatory release reason
        └── OfflineNoticeBanner.tsx      # Banner rendering connectivity loss notice

supabase/migrations/
├── 20260920000001_driver_fulfillment_schema.sql # driver_order_interactions table + partial unique index
└── 20260920000002_driver_fulfillment_rpcs.sql   # Driver RPCs + validate_order_transition amendment
```

---

## Architectural & Implementation Decisions

### 1. Single Source of Truth for Availability
- **Decision**: Keep `driver_profiles.is_available` as the sole authority for driver availability.
- **Rule**: Do NOT add `is_available` to `profiles`. Newly created driver accounts default to `is_available = false` (Offline). Only drivers can toggle this value via `toggle_driver_availability`.
- **Query Predicate**: `EXISTS (SELECT 1 FROM driver_profiles dp WHERE dp.user_id = auth.uid() AND dp.is_available = true)`.

### 2. Reuse Hardened `claim_order`
- **Decision**: Use `claim_order(p_order_id, p_driver_id)` as-is.
- **Rationale**: `claim_order` already handles self-claim checks, driver role verification, active order uniqueness check, row-level locking atomic claiming, `driver_profiles.current_order_id` updates, and the necessary `app.order_maintenance` GUC escape.
- **Rule**: Do NOT create a duplicate `accept_order` RPC.

### 3. Trigger-Safe Order Release
- **Decision**: Implement `release_order(p_order_id, p_reason)` with dual-escape handling:
  - Sets transaction-scoped GUC: `PERFORM set_config('app.order_maintenance', 'on', true);`.
  - Reverts order: `SET driver_id = NULL, status = 'pending', accepted_at = NULL, updated_at = now()`.
  - Resets GUC: `PERFORM set_config('app.order_maintenance', '', true);`.
  - Updates trigger: Amends `validate_order_transition` to bypass when `app.order_maintenance = 'on'` (matching `orders_column_guard`).
  - Clears pointer: `UPDATE driver_profiles SET current_order_id = NULL WHERE user_id = auth.uid();`.
  - Audit trail: Inserts record into `driver_order_interactions` with `interaction_type = 'released'` and `reason = p_reason`.

### 4. Repeat Releases Allowed via Partial Unique Index
- **Decision**: Use partial unique index:
  ```sql
  CREATE UNIQUE INDEX doi_unique_decline
    ON public.driver_order_interactions(driver_id, order_id)
    WHERE interaction_type = 'declined';
  ```
- **Rationale**: A driver may only decline an order once. However, if a driver accepts an order, releases it, and later re-accepts and releases it again, no unique constraint violation occurs.

### 5. Pre-Acceptance Privacy via Store Address
- **Decision**: Available orders display store name, store neighbourhood (from `restaurants.address`), and item count.
- **Rationale**: Completely protects customer privacy (FR-004) without modifying the `orders` table schema or deriving leaky "Home"/"Work" labels.

### 6. Active Order Retrieval via Standard Query
- **Decision**: Query active orders directly using TanStack Query:
  ```typescript
  supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('driver_id', user.id)
    .in('status', ['accepted', 'preparing', 'out_for_delivery'])
    .maybeSingle();
  ```
- **Rationale**: Avoids redundant RPC code per Principle X. Already protected by `orders_customer_or_driver_select` RLS.

### 7. Delivery History via `SECURITY DEFINER` RPC
- **Decision**: `get_driver_history()` must be `SECURITY DEFINER`.
- **Rationale**: When an order is released, `driver_id` is set to `NULL`. Standard RLS hides it from the releasing driver. A definer RPC with driver-role verification assembles the full history from `driver_order_interactions` joined with `orders`.

### 8. Graceful Offline Order Pool
- **Decision**: `get_available_orders()` returns `[]` when `is_available = false`.
- **Rationale**: Provides a seamless UX without relying on catch/error flows.

### 9. Strict Sequential Lifecycle Progression
- **Decision**: `advance_order_status(p_order_id)` advances `accepted -> preparing -> out_for_delivery -> delivered` without parameters.
- **Rationale**: Status and timestamps are allowlisted in `orders_column_guard`, so this executes without maintenance GUCs.

### 10. Proactive Offline Guard (`expo-network`)
- **Decision**: Explicit task to install `expo-network` (`~7.0.5`).
- **Behavior**: Renders `OfflineNoticeBanner`. Aborts all driver mutations if disconnected, displaying "No connection — please retry."

---

## Database Schema & Migration Requirements

### Migration 1: Schema Updates & Interaction Table
**File**: `supabase/migrations/20260920000001_driver_fulfillment_schema.sql`

```sql
-- 1. Create driver order interactions table for declines and releases
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

-- 2. Partial unique index: decline is unique per driver & order; releases are unlimited
CREATE UNIQUE INDEX IF NOT EXISTS doi_unique_decline
  ON public.driver_order_interactions(driver_id, order_id)
  WHERE interaction_type = 'declined';

CREATE INDEX IF NOT EXISTS doi_driver_idx ON public.driver_order_interactions(driver_id);
CREATE INDEX IF NOT EXISTS doi_order_idx ON public.driver_order_interactions(order_id);
CREATE INDEX IF NOT EXISTS doi_driver_type_idx ON public.driver_order_interactions(driver_id, interaction_type);

-- 3. Enable RLS on interactions
ALTER TABLE public.driver_order_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY driver_interactions_select ON public.driver_order_interactions
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());
```

### Migration 2: Driver Stored Procedures & Trigger Amendment
**File**: `supabase/migrations/20260920000002_driver_fulfillment_rpcs.sql`

```sql
-- 1. Update validate_order_transition to allow maintenance escape (needed by release_order)
CREATE OR REPLACE FUNCTION public.validate_order_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
begin
  -- Maintenance escape hatch: allows release_order to revert active order to pending
  if coalesce(current_setting('app.order_maintenance', true), '') = 'on' then
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
         (old.status = 'pending'            and new.status in ('accepted', 'cancelled', 'rejected'))
      or (old.status = 'accepted'           and new.status = 'preparing')
      or (old.status = 'preparing'          and new.status = 'out_for_delivery')
      or (old.status = 'out_for_delivery'   and new.status = 'delivered')
    ) then
      raise exception 'Invalid order status transition: % -> %', old.status, new.status
        using errcode = '23514';
    end if;
  end if;

  if new.status = 'accepted' and new.accepted_at is null then
    new.accepted_at := now();
  end if;
  if new.status = 'delivered' and new.delivered_at is null then
    new.delivered_at := now();
  end if;

  return new;
end;
$function$;

-- 2. Toggle Driver Availability
CREATE OR REPLACE FUNCTION public.toggle_driver_availability(p_is_available BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (SELECT app_private.has_role('driver')) THEN
    RAISE EXCEPTION 'DRIVER_ROLE_REQUIRED';
  END IF;

  UPDATE public.driver_profiles
     SET is_available = p_is_available,
         updated_at   = now()
   WHERE user_id = auth.uid();

  RETURN jsonb_build_object('is_available', p_is_available);
END;
$$;

-- 3. Get Available Orders (Privacy Safe, Empty when Offline)
CREATE OR REPLACE FUNCTION public.get_available_orders()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (SELECT app_private.has_role('driver')) THEN
    RAISE EXCEPTION 'DRIVER_ROLE_REQUIRED';
  END IF;

  -- Return empty if driver is Offline
  IF NOT EXISTS (
    SELECT 1 FROM public.driver_profiles
    WHERE user_id = auth.uid() AND is_available = true
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Return empty if driver already has an active order
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE driver_id = auth.uid()
      AND status IN ('accepted', 'preparing', 'out_for_delivery')
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'id', o.id,
                 'storeName', o.restaurant_name,
                 'storeNeighbourhood', r.address,
                 'itemCount', (SELECT COUNT(*)::int FROM public.order_items oi WHERE oi.order_id = o.id),
                 'createdAt', o.created_at
               ) ORDER BY o.created_at ASC
             )
        FROM public.orders o
        JOIN public.restaurants r ON r.id = o.restaurant_id
       WHERE o.status = 'pending'
         AND o.driver_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.driver_order_interactions doi
           WHERE doi.driver_id = auth.uid()
             AND doi.order_id = o.id
             AND doi.interaction_type = 'declined'
         )
    ),
    '[]'::jsonb
  );
END;
$$;

-- 4. Decline Order
CREATE OR REPLACE FUNCTION public.decline_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (SELECT app_private.has_role('driver')) THEN
    RAISE EXCEPTION 'DRIVER_ROLE_REQUIRED';
  END IF;

  INSERT INTO public.driver_order_interactions (driver_id, order_id, interaction_type)
  VALUES (auth.uid(), p_order_id, 'declined')
  ON CONFLICT (driver_id, order_id) WHERE interaction_type = 'declined' DO NOTHING;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Advance Order Status
CREATE OR REPLACE FUNCTION public.advance_order_status(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_current_status TEXT;
  v_next_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (SELECT app_private.has_role('driver')) THEN
    RAISE EXCEPTION 'DRIVER_ROLE_REQUIRED';
  END IF;

  SELECT status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id AND driver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_NOT_ASSIGNED';
  END IF;

  v_next_status := CASE v_current_status
    WHEN 'accepted' THEN 'preparing'
    WHEN 'preparing' THEN 'out_for_delivery'
    WHEN 'out_for_delivery' THEN 'delivered'
    ELSE NULL
  END;

  IF v_next_status IS NULL THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot advance from %', v_current_status;
  END IF;

  UPDATE public.orders
     SET status       = v_next_status,
         delivered_at = CASE WHEN v_next_status = 'delivered' THEN now() ELSE delivered_at END,
         updated_at   = now()
   WHERE id = p_order_id;

  RETURN jsonb_build_object('order_id', p_order_id, 'new_status', v_next_status);
END;
$$;

-- 6. Release Order (with GUC escape and current_order_id clearing)
CREATE OR REPLACE FUNCTION public.release_order(p_order_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (SELECT app_private.has_role('driver')) THEN
    RAISE EXCEPTION 'DRIVER_ROLE_REQUIRED';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'RELEASE_REASON_REQUIRED: A valid reason must be provided to release an order.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = p_order_id
      AND driver_id = auth.uid()
      AND status IN ('accepted', 'preparing', 'out_for_delivery')
  ) THEN
    RAISE EXCEPTION 'ORDER_NOT_ACTIVE_OR_NOT_ASSIGNED';
  END IF;

  -- Record release interaction
  INSERT INTO public.driver_order_interactions (driver_id, order_id, interaction_type, reason)
  VALUES (auth.uid(), p_order_id, 'released', TRIM(p_reason));

  -- Revert order using GUC maintenance escape hatch
  PERFORM set_config('app.order_maintenance', 'on', true);

  UPDATE public.orders
     SET driver_id   = NULL,
         status      = 'pending',
         accepted_at = NULL,
         updated_at  = now()
   WHERE id = p_order_id;

  PERFORM set_config('app.order_maintenance', '', true);

  -- Explicitly clear the driver's active order pointer
  UPDATE public.driver_profiles
     SET current_order_id = NULL,
         updated_at       = now()
   WHERE user_id = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Get Driver History (SECURITY DEFINER to access released orders)
CREATE OR REPLACE FUNCTION public.get_driver_history()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF NOT (SELECT app_private.has_role('driver')) THEN
    RAISE EXCEPTION 'DRIVER_ROLE_REQUIRED';
  END IF;

  RETURN COALESCE(
    (
      SELECT jsonb_agg(h ORDER BY h.order_date DESC)
      FROM (
        -- Completed orders
        SELECT o.id AS id,
               o.id AS order_id,
               o.restaurant_name AS store_name,
               o.delivered_at AS order_date,
               'completed' AS final_status,
               NULL::text AS release_reason
          FROM public.orders o
         WHERE o.driver_id = auth.uid()
           AND o.status = 'delivered'

        UNION ALL

        -- Declined orders
        SELECT doi.id AS id,
               o.id AS order_id,
               o.restaurant_name AS store_name,
               doi.created_at AS order_date,
               'declined' AS final_status,
               NULL::text AS release_reason
          FROM public.driver_order_interactions doi
          JOIN public.orders o ON o.id = doi.order_id
         WHERE doi.driver_id = auth.uid()
           AND doi.interaction_type = 'declined'

        UNION ALL

        -- Released orders
        SELECT doi.id AS id,
               o.id AS order_id,
               o.restaurant_name AS store_name,
               doi.created_at AS order_date,
               'released' AS final_status,
               doi.reason AS release_reason
          FROM public.driver_order_interactions doi
          JOIN public.orders o ON o.id = doi.order_id
         WHERE doi.driver_id = auth.uid()
           AND doi.interaction_type = 'released'
      ) h
    ),
    '[]'::jsonb
  );
END;
$$;

-- Grant EXECUTE to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.toggle_driver_availability(BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_orders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_order(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.advance_order_status(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_order(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_driver_history() TO authenticated, service_role;
```

---

## State Ownership Model

| Domain Concern | Owner | Storage / Mechanism | Cache Invalidation Trigger |
|---|---|---|---|
| **Driver Availability** | TanStack Query | Query cache `['driver', 'availability']` | On `toggleAvailability` mutation |
| **Available Orders Pool** | TanStack Query | Query cache `['driver', 'availableOrders']` | On `driver_pool_signals` Realtime event (refetched via `get_available_orders`), pull-to-refresh, or claim/decline |
| **Active Order** | TanStack Query | Query cache `['driver', 'activeOrder']` | On `claimOrder`, `advanceStatus`, `releaseOrder`, or Realtime event |
| **Delivery History** | TanStack Query | Query cache `['driver', 'history']` | On order delivery, decline, or release |
| **Network Status** | React Context / Hook | Local device event listener (`expo-network`) | Reactive event from OS network monitor |
| **Driver Auth Role** | `AuthContext` | Memory + Supabase session token | On sign-in / sign-out |
| **Pool Change Signals** | Supabase Realtime | `driver_pool_signals` table (PII-free: order_id + kind), trigger-emitted on order added/claimed/released | INSERT event → invalidate the pool query |

**Why `driver_pool_signals` exists (T045 remediation)**: Supabase Realtime enforces RLS on `postgres_changes` subscriptions. Drivers cannot SELECT pending order rows (`driver_id IS NULL` under `orders_customer_or_driver_select`), so a subscription on `orders` never fires for pool changes; granting drivers row access would instead leak the customer's `delivery_address` (FR-004). The signal table carries only an opaque order id, so its "all authenticated may read" policy leaks nothing and the privacy-safe projection remains the single data path.

---

## Acceptance & Validation Scenarios

Numbering matches `quickstart.md` Verification Scenarios 1-10 exactly (review remediation I2). Driver-layout role protection (US7) is not a quickstart scenario; it is verified by T029's independent test against the US7 acceptance criteria in `spec.md`.

1. **Driver Availability Toggle** (quickstart Scenario 1, SC-001): Driver switches to Offline -> order pool disappears immediately. Calling `get_available_orders()` returns `[]`. Switching to Available restores live orders within 2s.
2. **Unclaimed Order Privacy & Details** (quickstart Scenario 2): Available order cards show store name, store neighbourhood from `restaurants.address`, item count. Full customer address and phone are absent from payload and view.
3. **Atomic Order Claiming & Race Condition Handling** (quickstart Scenario 3, SC-002): When two Available drivers tap Claim on the same pending order simultaneously, exactly one succeeds (`claimed: true`) and transitions to active order; the second receives `claimed: false` with a friendly "Order no longer available" banner.
4. **Single Active Order Guard** (quickstart Scenario 4): While holding an active order, available orders tab hides order list entirely. Attempting to call `claim_order` returns error `Driver already has an active order`.
5. **Order Decline Flow** (quickstart Scenario 5): Driver A declines an order -> it vanishes from Driver A's list and appears in Driver A's history as `declined`. Driver B still sees and can claim the order.
6. **Strict Sequential Lifecycle Progression** (quickstart Scenario 6, incl. customer realtime sync FR-010): Active order advances in sequence: `accepted -> preparing -> out_for_delivery -> delivered`. Jumping states is rejected by server. Each advancement propagates to the customer's order view automatically via Supabase Realtime without manual refresh.
7. **Order Release / Stuck Order Resolution** (quickstart Scenario 7): Releasing an order requires a non-empty text reason. On submission, order reverts to `pending` with `driver_id = NULL` using the maintenance GUC, `driver_profiles.current_order_id` is reset to `NULL`, the order reappears in pool for other drivers, and logs in history with reason.
8. **Repeat Releases** (quickstart Scenario 8): A driver who accepts, releases, re-accepts, and releases the same order does not encounter a unique constraint error (partial unique index covers declines only).
9. **Delivery History via SECURITY DEFINER** (quickstart Scenario 9): History lists completed, declined, released, and cancelled orders sorted newest-first. Released orders (where `driver_id` is currently `NULL`) render with their release reason; cancelled entries appear only for drivers who had declined or accepted-then-released the order.
10. **Offline Network Notice & Action Blocking** (quickstart Scenario 10): Disconnecting network displays offline notice banner via `expo-network`. Tapping claim or status update displays "No connection — please retry" and aborts immediately.

---

## Complexity Tracking

> **No Constitution violations requiring justification.**
> 
> All decisions strictly align with Principles I–X:
> - Reusing live `driver_profiles.is_available` and `claim_order` avoids code duplication and trigger failures (Principles V, VI, X).
> - GUC escape hatch in `release_order` safely coordinates with `orders_column_guard` and `validate_order_transition` triggers (Principle VI).
> - Standard TanStack Query for active order eliminates unnecessary RPC wrappers (Principle X).
> - Realtime synchronization leverages existing Supabase Realtime without Redux bloat (Principles IV, VIII).
