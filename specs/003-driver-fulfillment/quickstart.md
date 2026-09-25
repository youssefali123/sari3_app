# Quickstart & Verification Guide: Driver Fulfillment (Amended)

**Feature**: Driver Fulfillment  
**Branch**: `003-driver-fulfillment`  
**Date**: 2026-09-20 (Amended)  
**Status**: Ready for Implementation

This guide provides runnable manual verification flows and test scenarios to validate driver fulfillment end-to-end.

---

## 1. Prerequisites & Environment Setup

1. **Local Supabase Instance**: Running with applied migrations:
   ```bash
   npx supabase status
   ```
2. **Test Accounts**:
   - Customer account: `customer@sari3.test` (role: `customer`)
   - Driver account 1: `driver1@sari3.test` (role: `driver`, has row in `public.driver_profiles`)
   - Driver account 2: `driver2@sari3.test` (role: `driver`, has row in `public.driver_profiles`)
3. **Dependencies**:
   - Install `expo-network`: `npx expo install expo-network`

---

## 2. Verification Scenarios

### Scenario 1: Driver Availability Toggle (FR-001, FR-002, User Story 1)

1. **Sign In**: Launch app, log in as `driver1@sari3.test`.
   - **Expected**: Redirected to `/(driver)/available-orders`.
2. **Initial State (Offline)**:
   - **Expected**: Toggle indicates "Offline". Order pool shows "You are currently offline. Go online to view and accept orders." No pending orders are rendered.
3. **Toggle Online**: Tap availability toggle to "Available".
   - **Expected**: Within 2 seconds, status updates to "Available". Order pool refreshes to show unclaimed orders or empty state if none exist.
4. **Database Check**:
   - `SELECT is_available FROM driver_profiles WHERE user_id = '<driver1_uuid>';` returns `true`.
5. **Offline Query Graceful Handling**:
   - Toggle back to Offline.
   - `SELECT public.get_available_orders();` as driver returns `[]::jsonb` (clean empty list, no error-driven control flow).

---

### Scenario 2: Unclaimed Order Privacy & Details (FR-003, FR-004, User Story 2)

1. **Create Order**: Using `customer@sari3.test` in customer app, place an order with 2 items.
2. **Driver View**: In `driver1` available orders tab (when Available):
   - **Expected**: Order card appears via realtime update within 3 seconds.
   - **Privacy Check**: Order card displays Store Name, Store Address/Neighbourhood (`restaurants.address`), and Item Count.
   - **Address Guard**: Customer full street address, apartment number, and phone number are NOT visible anywhere in the preview screen or query payload.

---

### Scenario 3: Atomic Order Claiming & Race Condition Handling (FR-005, FR-006, SC-002)

1. **Simultaneous Claim Setup**:
   - Open Driver 1 and Driver 2 on two devices/windows, both Available, viewing the same available order.
2. **Driver 1 Taps Claim**:
   - **Expected**: Driver 1 succeeds (`claimed: true`). Order moves to Active Order tab. Full delivery address and customer contact info become visible.
3. **Driver 2 Taps Claim on Same Order**:
   - **Expected**: Driver 2's request receives `claimed: false`. Driver 2 sees a friendly banner: "This order is no longer available." Order disappears from Driver 2's list.
   - **Database Check**: `SELECT driver_id, status FROM orders WHERE id = '<order_id>';` shows Driver 1's ID and status `accepted`. `driver_profiles.current_order_id` for Driver 1 is set to `<order_id>`.

---

### Scenario 4: Single Active Order Guard (FR-007)

1. While Driver 1 has an active order in `accepted` state:
   - Navigate to available orders tab.
   - **Expected**: Available orders list is hidden entirely. Screen indicates Driver has an order in progress, with a button to view active order.
   - **Server Guard Check**: Direct invocation of `SELECT public.claim_order('<another_order_id>', '<driver1_uuid>');` returns error `Driver already has an active order`.

---

### Scenario 5: Order Decline Flow (FR-008, User Story 3)

1. Have a pending order in the pool.
2. Driver 1 views order card and taps "Decline".
   - **Expected**: Order vanishes immediately from Driver 1's available orders list.
   - A row is inserted in `driver_order_interactions` with `interaction_type = 'declined'`.
3. Switch to Driver 2 (Available):
   - **Expected**: Order is still present and claimable by Driver 2.
4. Check Driver 1 History:
   - **Expected**: Order appears in Driver 1's delivery history with status `declined`.

---

### Scenario 6: Strict Sequential Lifecycle Progression (FR-009, FR-010, User Story 4)

1. In Driver 1 Active Order view (status: `accepted`):
   - Primary action button reads "Store is Preparing".
   - Tap button -> `advance_order_status` executes -> status becomes `preparing`.
   - Customer app order detail screen immediately reflects `preparing` via Realtime.
2. Primary action button updates to "Out for Delivery".
   - Tap button -> status advances to `out_for_delivery`.
   - Customer app immediately reflects `out_for_delivery`. Customer driver card shows Driver 1's name, photo, and phone.
3. Primary action button updates to "Delivered".
   - Tap button -> status advances to `delivered`.
   - Order moves out of Active Order tab to Delivery History.
   - `driver_profiles.current_order_id` is cleared.
   - Driver 1 is now free to accept new orders.

---

### Scenario 7: Order Release / Stuck Order Resolution (FR-014, User Story 8)

1. Place new order and claim with Driver 1.
2. In Active Order view, tap "Report Issue / Release Order".
3. **Validation Check**: Attempt to submit with empty reason.
   - **Expected**: Validation message: "Please provide a reason for releasing this order." Submit button disabled.
4. **Valid Submission**: Enter reason "Vehicle breakdown" and submit.
   - **Expected**: `release_order` executes using the GUC maintenance escape hatch.
   - Order is immediately removed from Driver 1's active tab.
   - `driver_profiles.current_order_id` is reset to `NULL`.
   - **Pool Check**: Order reappears in available orders pool for Driver 2 as a standard unclaimed order.
   - **History Check**: Driver 1 delivery history shows the order with status `released` and reason "Vehicle breakdown".

---

### Scenario 8: Repeat Releases (Partial Unique Index Validation)

1. Driver 1 accepts the released order again.
2. Driver 1 releases it again with reason "Second issue encountered".
   - **Expected**: Release succeeds cleanly without unique constraint violation.
   - Driver 1's history contains both release entries.

---

### Scenario 9: Delivery History via SECURITY DEFINER (FR-011, User Story 5)

1. Open `/(driver)/history`.
   - **Expected**: Completed, declined, released, and cancelled orders are listed in reverse chronological order (newest first).
   - Released orders (where `orders.driver_id` is currently NULL) are visible because `get_driver_history` is `SECURITY DEFINER`.
   - Each card displays store name, timestamp, and status badge (`completed`, `declined`, `released`, `cancelled`).
   - Released cards display the mandatory release reason.
   - A customer-cancelled order appears ONLY for drivers who previously interacted with it (declined it while pending, or accepted-then-released it); drivers who never saw it do not get a `cancelled` entry (US5-AS3).

---

### Scenario 10: Offline Network Notice & Action Blocking (FR-016)

1. While viewing Driver screens, toggle airplane mode / disable network.
   - **Expected**: A persistent offline banner appears: "No internet connection."
2. Attempt any action (availability toggle, claim order, advance status, release order).
   - **Expected**: Action is immediately blocked with notice "No connection — please retry." No optimistic updates or silent drops.
3. Re-enable network.
   - **Expected**: Banner dismisses, normal operations resume without app restart.
