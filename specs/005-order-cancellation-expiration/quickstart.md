# Quickstart Validation Guide: Order Cancellation & Expiration

**Feature**: `005-order-cancellation-expiration`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](./spec.md) | **Contracts**: [database-rpc.md](./contracts/database-rpc.md) | [domain-repositories.md](./contracts/domain-repositories.md)

---

## 1. Prerequisites & Environment Setup

Ensure the development environment is running with migrations applied.

### 1.1 Local Services

```bash
# 1. Verify Supabase local containers are running
npx supabase status

# 2. Apply database migrations
npx supabase migration up

# 3. Verify Edge Function is running or deployed
npx supabase functions serve notify-order-status --env-file .env.test
```

### 1.2 Test Accounts

Ensure you have two distinct accounts created in the auth database:
1. **Customer Account**: `customer@sari3.test` (Role: `customer`)
2. **Driver Account**: `driver@sari3.test` (Role: `driver`, Available: `true`)

---

## 2. End-to-End Validation Scenarios

### Scenario 1: Customer Self-Service Cancellation (US1)

**Goal**: Verify a customer can cancel orders across active pre-delivery states (`pending`, `accepted`, `preparing`, `out_for_delivery`) and is blocked once `delivered`.

1. **Place Order**: Log in as `customer@sari3.test`, add items to cart, and place an order.
2. **Cancel from `pending`**:
   - Open order details screen `/(customer)/orders/[id]`.
   - Tap **"Cancel Order"** and confirm.
   - **Expected**: Order status immediately updates to `cancelled`. Order row remains stored in DB.
3. **Cancel from `accepted` / `preparing` / `out_for_delivery`**:
   - Place another order.
   - Log in as driver, claim order (`accepted`).
   - Customer taps **"Cancel Order"** and confirms.
   - **Expected**: Status updates to `cancelled`. Driver capacity is released immediately.
4. **Delivered Guard**:
   - Place an order, advance it to `delivered` via driver stepper.
   - Customer opens order screen.
   - **Expected**: "Cancel Order" button is absent or disabled. Any direct RPC call fails with `ORDER_CANNOT_BE_CANCELLED`.

---

### Scenario 2: Real-Time Pool Removal (US2)

**Goal**: Verify unclaimed orders disappear from the Driver Available Orders pool in real time upon cancellation or expiration.

1. **Open Driver Pool**: Device/Browser A opens `/(driver)/available-orders`.
2. **Place Order**: Device/Browser B places a new order as customer.
3. **Verify Pool Entry**: Device A sees the order appear via Realtime.
4. **Trigger Cancellation**: Device B taps "Cancel Order".
5. **Expected Outcome**:
   - Within 1 second, Device A automatically removes the order from the list without manual refresh or pull-to-refresh.
   - Database row still exists with `status = 'cancelled'`.

---

### Scenario 3: Driver In-App Alert & Actor-Aware Push (US3)

**Goal**: Verify that when a customer cancels an accepted order, the assigned driver is alerted, their capacity is freed, and the customer receives no self-echo.

1. **Assign Driver**: Driver claims an order. Driver is on `/(driver)/active-order`.
2. **Customer Cancels**: Customer cancels the order.
3. **Driver In-App UI**:
   - The driver active order screen displays a prominent banner: **"Customer cancelled this order"**.
   - Stepper advance buttons are disabled.
   - Tapping "Return to Available Orders" returns the driver to the pool.
4. **Driver Capacity**:
   - Driver can immediately accept a new available order without encountering "Driver already has an active order" (error 23505).
5. **Push Notifications**:
   - Driver device receives push notification: `"The customer cancelled your order from {restaurant_name}"`.
   - Customer device receives **0 push notifications** (self-echo suppressed).
6. **Driver History Audit**:
   - Driver navigates to `/(driver)/history`.
   - **Expected**: The customer-cancelled delivery appears in history marked with status `"cancelled"`.

---

### Scenario 4: Stale Pending Order Expiration & Claim Guard (US4)

**Goal**: Verify pending orders older than 30 minutes expire automatically and cannot be claimed by drivers.

1. **Simulate Stale Order**:
   ```sql
   -- Create a pending order with created_at set to 31 minutes ago
   UPDATE public.orders
      SET created_at = now() - interval '31 minutes'
    WHERE id = '<test-order-id>' AND status = 'pending';
   ```
2. **Driver Claim Attempt**:
   - Attempt to claim `<test-order-id>` via `claim_order` RPC.
   - **Expected**: Returns `{ "claimed": false, "order": null }`. Claim is strictly rejected.
3. **Trigger Expiration Worker**:
   ```sql
   SELECT public.expire_stale_orders();
   ```
4. **Expected Outcome**:
   - Status transitions to `expired`.
   - Order disappears from `get_available_orders()` pool.
   - Customer receives push notification: `"Your order from {restaurant_name} expired as no driver was available"`.
   - Customer order details shows status "Expired".

---

### Scenario 5: Reorder from Expired/Past Orders ("Order Again") (US5)

**Goal**: Verify reordering validates current catalog availability, prompts on store conflict, and requires explicit checkout confirmation.

1. **Open Past Order**: Navigate to an expired or cancelled order in customer order history.
2. **Tap "Order Again"**:
   - System revalidates item snapshot against current store menu.
   - If store has closed or an item was deleted: alerts customer of unavailable items.
3. **Conflict Handling**:
   - If cart already has an item from Store A, and past order is from Store B:
     - `StoreConflictModal` displays: *"Replace cart items?"*.
     - Confirming clears Store A items and loads Store B items.
4. **Checkout Confirmation**:
   - App navigates customer to `/(customer)/checkout`.
   - Prices reflect current catalog prices.
   - Customer must explicitly tap "Place Order" to finalize (no automatic order generation).

---

### Scenario 6: Customer Order History Soft-Hiding (US6)

**Goal**: Verify hiding an order removes it from the customer's history list while keeping database snapshots and financial records completely intact.

1. **Hide Order**:
   - In order history `/(customer)/orders`, tap "Hide Order" / "Remove from History" on an order.
2. **Visibility Check**:
   - Order vanishes from the order history list.
   - Pull-to-refresh or re-logging in confirms it remains hidden.
3. **Database Audit Verification**:
   ```sql
   SELECT id, customer_hidden_at, total_amount, status FROM public.orders WHERE id = '<order-id>';
   ```
   - **Expected**: Row exists, `customer_hidden_at` is set to timestamp, financial amounts and items are unaltered.
4. **Ownership Guard**:
   - Attempting to call `hide_order` as User B on an order owned by User A raises an authorization error.
5. **Deep-Link Check**:
   - Navigating directly to `/(customer)/orders/<order-id>` loads details and allows "Order Again".

---

### Scenario 7: Concurrent Status Advance vs Cancellation Race (US7)

**Goal**: Verify that interleaved customer cancellation and driver advance status does not trigger an unhandled database exception dialog.

1. **Simulate Concurrent Race**:
   - Driver calls `advance_order_status` at the moment order is marked `cancelled`.
2. **Expected Outcome**:
   - The RPC returns `{ "success": false, "error": "ORDER_STATUS_CHANGED", "message": "Order is no longer in expected state" }`.
   - Driver app catches response cleanly, alerts driver that order was cancelled, and transitions back to available pool without a raw SQL error crash.
