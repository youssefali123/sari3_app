# Research & Architectural Decisions: Driver Fulfillment (Amended)

**Feature**: Driver Fulfillment  
**Branch**: `003-driver-fulfillment`  
**Date**: 2026-09-20 (Amended)  
**Status**: Completed

---

## 1. Driver Availability Status Management

### Context
FR-001 and FR-002 require a driver availability toggle (Available/Offline) enforced server-side. An Offline driver must not view or claim orders regardless of client state.
The live schema already contains `public.driver_profiles.is_available` (boolean, default `false`, with existing own-row SELECT and UPDATE RLS policies, and modeled by `DriverProfile.isAvailable`). Adding `is_available` to `public.profiles` would create duplicate sources of truth prone to drift.

### Decision
- **Single Source of Truth**: Keep `public.driver_profiles.is_available` as the sole authority for driver availability.
- **Do Not Alter `profiles`**: Do not add `is_available` to `profiles`. `UserProfile` in domain remains unchanged.
- **Availability Toggle RPC**: `toggle_driver_availability(p_is_available BOOLEAN)` updates `driver_profiles.is_available` for `user_id = auth.uid()` and returns the updated state.
- **Pool Query Predicate**: The available-orders query checks:
  ```sql
  EXISTS (
    SELECT 1 FROM public.driver_profiles dp
    WHERE dp.user_id = auth.uid() AND dp.is_available = true
  )
  ```
- **Graceful Offline Response**: When the driver is Offline, the available orders query returns an empty list `[]` instead of throwing an exception, providing a smooth UX without error-driven control flow.

### Rationale
- Prevents split-brain availability state.
- Leverages existing `driver_profiles` table, RLS policies, and domain entity `DriverProfile.ts`.

---

## 2. Order Claiming: Reusing Hardened `claim_order`

### Context
FR-005 requires atomic, concurrency-safe claiming of available orders. The live schema already has a hardened, production-tested `public.claim_order(p_order_id UUID, p_driver_id UUID)` RPC (introduced in migration `20260919000010` and refined in `20260919000011` and `20260919000012`).
The `orders` table has an active `orders_column_guard` BEFORE UPDATE trigger that strictly prohibits direct changes to `driver_id` unless the transaction-local GUC `app.order_maintenance = 'on'` is set. Any newly written `accept_order` RPC without the GUC escape would be rejected by the column guard trigger.

### Decision
- **Reuse Existing RPC**: Use `public.claim_order(p_order_id, p_driver_id)` as-is. Do NOT create a duplicate `accept_order` RPC.
- **Existing Hardening Features in `claim_order`**:
  1. Caller self-claim verification (`p_driver_id = auth.uid()`).
  2. Role check via `app_private.has_role('driver')`.
  3. One active order check (`NOT EXISTS (SELECT 1 FROM orders WHERE driver_id = p_driver_id AND status IN ('accepted', 'preparing', 'out_for_delivery'))`).
  4. Scoped transaction-local GUC escape: `PERFORM set_config('app.order_maintenance', 'on', true);` before the update, reset immediately after.
  5. Atomic claiming: `UPDATE orders SET driver_id = p_driver_id, status = 'accepted', accepted_at = now(), updated_at = now() WHERE id = p_order_id AND status = 'pending' AND driver_id IS NULL RETURNING *`.
  6. Return payload: `{ claimed: boolean, order: jsonb }` (captured safely before any PERFORM can clobber `FOUND`).
  7. Updates `driver_profiles.current_order_id = p_order_id`.

### Rationale
- Completely eliminates redundant code and prevents trigger collision with `orders_column_guard`.
- Fully satisfies FR-005, FR-006, FR-007, and SC-002.

---

## 3. Order Lifecycle State Machine (`advance_order_status`)

### Context
FR-009 requires strict sequential order progression: `accepted -> preparing -> out_for_delivery -> delivered`. Skipping or reversing states must be rejected server-side.
The live schema already enforces this via the `validate_order_transition` trigger on `public.orders`. Furthermore, `status`, `updated_at`, and `delivered_at` are explicitly allowlisted in the `orders_column_guard` trigger.

### Decision
- Implement `advance_order_status(p_order_id UUID)` without client-supplied target status parameters:
  - Verifies driver role and `orders.driver_id = auth.uid()`.
  - Determines next valid status:
    - `accepted` -> `preparing`
    - `preparing` -> `out_for_delivery`
    - `out_for_delivery` -> `delivered`
  - Updates `orders.status = v_next_status` (and `delivered_at = now()` on delivery).
- **No GUC Escape Needed**: Because `status`, `updated_at`, and `delivered_at` are allowlisted in `orders_column_guard`, and the transitions are explicitly allowed by `validate_order_transition`, a plain UPDATE executes cleanly through the triggers without needing `app.order_maintenance`.

---

## 4. Order Decline (Driver-Scoped, Non-Blocking)

### Context
FR-008 requires that a driver can decline an available order, removing it from their view without affecting other drivers' ability to claim it. Declined orders appear in delivery history.

### Decision
- Create `public.driver_order_interactions` table:
  ```sql
  CREATE TABLE public.driver_order_interactions (
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
  ```
- **Partial Unique Index for Declines**:
  ```sql
  CREATE UNIQUE INDEX doi_unique_decline
    ON public.driver_order_interactions(driver_id, order_id)
    WHERE interaction_type = 'declined';
  ```
  *(Releases do NOT have a unique constraint, allowing repeat releases if an order is re-accepted and released again).*
- `decline_order(p_order_id UUID)` RPC inserts an interaction row with `interaction_type = 'declined'`.
- The pool query excludes orders where a `declined` interaction exists for the current driver.

---

## 5. Order Release (Stuck Order Resolution & Trigger Collision Avoidance)

### Context
FR-014 requires a driver to self-report inability to complete an active order with a mandatory reason. The order must revert to `pending` with `driver_id = NULL` to re-enter the shared pool.
Two live database triggers would block this without explicit handling:
1. **`orders_column_guard`**: Modifying `driver_id` (setting to `NULL`) raises an exception unless `app.order_maintenance = 'on'`.
2. **`validate_order_transition`**: Only permits forward transitions (`pending -> accepted/cancelled/rejected`, `accepted -> preparing`, etc.). Reverting `accepted/preparing/out_for_delivery -> pending` raises `Invalid order status transition`.
3. **`driver_profiles.current_order_id`**: Stored pointer must be cleared when an order is released; otherwise, the driver is left holding a stale reference.

### Decision
Implement `release_order(p_order_id UUID, p_reason TEXT)` as a `SECURITY DEFINER` RPC:
1. **Validation**: Check driver role, caller is assigned driver (`orders.driver_id = auth.uid()`), order is active (`accepted`, `preparing`, `out_for_delivery`), and `TRIM(p_reason)` is non-empty.
2. **Record Release Interaction**: Insert into `driver_order_interactions(driver_id, order_id, interaction_type, reason)` with `interaction_type = 'released'`.
3. **Update `validate_order_transition`**: Amend `validate_order_transition` to bypass transition validation when `app.order_maintenance = 'on'` (matching `orders_column_guard`).
4. **Dual GUC Escape & Order Reversion**:
   ```sql
   PERFORM set_config('app.order_maintenance', 'on', true);

   UPDATE public.orders
      SET driver_id   = NULL,
          status      = 'pending',
          accepted_at = NULL,
          updated_at  = now()
    WHERE id = p_order_id;

   PERFORM set_config('app.order_maintenance', '', true);
   ```
5. **Clear Driver Profile Pointer**:
   ```sql
   UPDATE public.driver_profiles
      SET current_order_id = NULL,
          updated_at       = now()
    WHERE user_id = auth.uid();
   ```

### Rationale
- Completely avoids trigger collisions while preserving trigger protection for all other paths.
- Guarantees driver's active order pointer is cleared immediately so they are unblocked.
- Allows repeat releases without unique constraint collisions.

---

## 6. Pre-Acceptance Privacy & Available Orders Pool

### Context
FR-003 and FR-004 require showing unclaimed orders to Available drivers with store name, general area, and item count — but NO customer personal address or phone number.
Deriving "delivery_zone" from `saved_addresses.label` is semantically incorrect (customers often use "Home" or "Work", which is uninformative and slightly leaky).

### Decision
- **No `delivery_zone` Column on `orders`**: Skip adding `delivery_zone` to `orders` (preserves MVP simplicity, Principle X).
- **Display Store Neighbourhood**: Use the store's neighbourhood (from `restaurants.address`, which is already public catalog data) on the pre-acceptance preview card.
- **Available Orders Query (`get_available_orders`)**:
  - Filter: `status = 'pending' AND driver_id IS NULL`.
  - Exclusion: Not declined by caller.
  - Gate: Caller must be Available in `driver_profiles`. If Offline, return `[]`.
  - Projection: `id`, `store_name`, `store_address`, `item_count`, `created_at`.
  - Customer `delivery_address` and personal info are strictly excluded from the query.

---

## 7. Delivery History: `SECURITY DEFINER` RPC

### Context
FR-011 requires drivers to view their past completed, declined, and released orders.
After an order is released, its `driver_id` is set to `NULL`. Under existing RLS (`auth.uid() = customer_id OR auth.uid() = driver_id`), the released order is hidden from the driver who released it. A plain client query cannot retrieve released orders.

### Decision
- Implement `get_driver_history()` as a `SECURITY DEFINER` RPC:
  - Verifies caller has driver role.
  - Queries completed orders (`driver_id = auth.uid() AND status = 'delivered'`).
  - Joins `driver_order_interactions` with `orders` for `declined` and `released` entries (including `reason`).
  - Returns combined list ordered newest-first.

---

## 8. Active Order Retrieval: Plain Query (Dropping Unnecessary RPC)

### Context
Principle X (Practical MVP Simplicity) dictates avoiding unnecessary RPC wrappers when standard queries suffice.

### Decision
- Drop `get_driver_active_order` RPC.
- The driver client retrieves their active order via standard Supabase query:
  ```typescript
  supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('driver_id', user.id)
    .in('status', ['accepted', 'preparing', 'out_for_delivery'])
    .maybeSingle();
  ```
  This is fully supported by the existing `orders_customer_or_driver_select` RLS policy (`auth.uid() = driver_id`).

---

## 9. Network Connectivity Handling (`expo-network`)

### Context
FR-016 requires explicit offline banner and blocking driver actions when network is disconnected. No optimistic updates.

### Decision
- Install and configure `expo-network` (`~7.0.5`) as an explicit implementation task.
- Abstract connectivity via `NetworkStatusService` in domain.
- `OfflineNoticeBanner` in presentation renders when offline.
- Mutation hooks verify connectivity before invoking RPCs.

---

## 10. Summary of Architectural Amendments

| Topic | Initial Plan | Amended Plan (Corrected) |
|---|---|---|
| **Driver Availability** | Added `is_available` to `profiles` | Reuses existing `driver_profiles.is_available` as single source of truth |
| **Order Claiming** | New `accept_order` RPC | Reuses hardened `claim_order(p_order_id, p_driver_id)` RPC with GUC escape |
| **Order Release** | Plain UPDATE (would fail triggers) | Dual GUC escape (`app.order_maintenance = 'on'`) + updates `validate_order_transition` + clears `driver_profiles.current_order_id` |
| **Interaction Uniqueness** | `UNIQUE (driver_id, order_id, type)` | Partial unique index on `declined` only; releases unlimited |
| **Area Preview** | Added `delivery_zone` from address label | Uses store neighbourhood (`restaurants.address`), no schema change on `orders` |
| **Active Order Query** | Custom `get_driver_active_order` RPC | Standard TanStack Query with RLS (Principle X) |
| **Driver History Query** | Ambiguous query | Explicit `SECURITY DEFINER` RPC (necessary because released orders have `driver_id = NULL`) |
| **Offline Order Pool** | Threw `DRIVER_NOT_AVAILABLE` | Returns `[]` gracefully when offline |
| **Network Package** | Assumed present | Explicitly noted as new dependency install task (`expo-network`) |
