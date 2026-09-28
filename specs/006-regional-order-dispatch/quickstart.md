# Quickstart: Regional Order Dispatch & Store Browsing

**Feature Branch**: `006-regional-order-dispatch`  
**Date**: 2026-09-26  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

---

## 1. Prerequisites & Test Accounts

Ensure local or staging Supabase instance is running and recent migrations up through `20260925000002_order_cancellation_expiration.sql` are applied.

### Accounts:
- **Guest**: Launch app without logging in.
- **Customer Account**: `customer@sari3.test` (Role: `customer`)
- **Driver Account 1 (Fayoum)**: `driver@sari3.test` (Role: `driver`, Available: `true`, assigned to Fayoum)
- **Driver Account 2 (Senours)**: `driver2@sari3.test` (Role: `driver`, Available: `true`, assigned to Senours)
- **Unassigned Driver**: `driver_new@sari3.test` (Role: `driver`, Available: `true`, 0 assigned areas)

---

## 2. Validation Scenarios

### Scenario 1: Customer Drill-Down Area Selection & Store Filtering
**Goal**: Verify exact-match store filtering and drill-down selection (no parent rollup).

1. Open the customer app on the home screen `/(customer)/(home)`.
2. Notice the area indicator chip in the header (defaults to "Fayoum" or prompts "Select Area").
3. Tap the area chip to open the drill-down picker modal.
4. Drill down: Select "Fayoum" → choose "Senours".
5. Verify:
   - Header chip updates to display "Senours".
   - Store listing re-fetches and displays only stores with `area_id` matching Senours.
   - Stores belonging directly to "Fayoum" or other areas do NOT appear.
6. Open the picker again: Select "Fayoum" → choose "Fayoum only".
7. Verify:
   - Store listing displays only stores directly assigned to "Fayoum" (exact match).
   - Senours stores are excluded.

---

### Scenario 2: Guest Area Selection & Cross-Session Persistence
**Goal**: Verify guest Redux storage and automatic migration to customer profile upon login.

1. As an unauthenticated guest, open the area picker and select "Senours".
2. Browse stores; verify stores are filtered to Senours.
3. Close and reopen the app (within same session); verify "Senours" remains active.
4. Navigate to profile or checkout, and log in as `customer@sari3.test`.
5. Verify in database/profile:
   - `profiles.selected_area_id` is automatically updated to the Senours area ID.
6. Log out and log in again:
   - Verify that "Senours" is restored from the profile into active Redux state.

---

### Scenario 3: Driver Area Scoping & Strict Non-Inheritance
**Goal**: Verify driver pool query restricts orders strictly to driver's assigned areas.

1. In the database, ensure:
   - Store A is in Fayoum (`20000000-0000-0000-0000-000000000001`).
   - Store B is in Senours (`20000000-0000-0000-0000-000000000002`).
2. Place Order 1 at Store A (Fayoum) and Order 2 at Store B (Senours). Both are in `pending` status.
3. Log in as Driver 1 (`driver@sari3.test`, assigned to Fayoum only) and open `/(driver)/available-orders`.
4. Verify:
   - Driver 1 sees Order 1 (Fayoum).
   - Driver 1 does NOT see Order 2 (Senours), even though Senours is a child of Fayoum in the area tree.
5. Log in as Driver 2 (`driver2@sari3.test`, assigned to Senours only).
6. Verify:
   - Driver 2 sees Order 2 (Senours).
   - Driver 2 does NOT see Order 1 (Fayoum).

---

### Scenario 4: Driver Safe-Default-Deny for Unassigned Drivers
**Goal**: Verify an unassigned driver sees an empty pool and a dedicated message.

1. Log in as `driver_new@sari3.test` (driver has 0 rows in `driver_areas`).
2. Navigate to `/(driver)/available-orders`.
3. Verify:
   - Network response for `get_available_orders()` returns `[]`.
   - UI displays the clear empty state: "No areas assigned: contact support to set up your delivery zones".
   - The driver cannot see or claim any pending orders across the platform.

---

### Scenario 5: Regional Push Notification Scoping
**Goal**: Verify push notifications reach only drivers assigned to the order's region.

1. Register active push tokens for Driver 1 (Fayoum) and Driver 2 (Senours).
2. Place a new order at Store A (Fayoum).
3. Inspect `notification_events` and Edge Function execution logs for `notify-order-status`.
4. Verify:
   - Push notification is dispatched to Driver 1's device token.
   - Push notification is NOT dispatched to Driver 2's device token (0% cross-region leakage).

---

### Scenario 6: Database RLS & Tamper-Proof Security
**Goal**: Confirm clients cannot mutate area reference data or assignments.

1. Using Supabase client with anon key:
   - Execute `supabase.from('areas').insert({ name: 'Hacked Area' })`.
   - **Expected**: Rejected by RLS (permission denied).
2. Using Supabase client with authenticated driver JWT:
   - Execute `supabase.from('driver_areas').insert({ driver_id: auth.uid(), area_id: '...' })`.
   - **Expected**: Rejected by RLS.
3. Using Supabase client with authenticated customer JWT:
   - Execute `supabase.from('restaurants').update({ area_id: '...' }).eq('id', '...')`.
   - **Expected**: Rejected by RLS.

---

### Scenario 7: Catalog Backfill & Migration Verification
**Goal**: Confirm all existing restaurants and test drivers remain active and functional post-migration.

1. Run verification query:
   ```sql
   SELECT count(*) FROM public.restaurants WHERE area_id IS NULL;
   -- Expected: 0
   ```
2. Run test driver assignment query:
   ```sql
   SELECT count(*) FROM public.driver_areas WHERE area_id = '20000000-0000-0000-0000-000000000001';
   -- Expected: >= 1 (test drivers assigned)
   ```
3. Open customer browsing in Fayoum:
   - Verify all pre-existing seeded restaurants appear in the home feed.
