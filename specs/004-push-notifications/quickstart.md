# Quickstart Validation Guide: Push Notifications

**Feature Branch**: `004-push-notifications`
**Date**: 2026-09-22
**Spec**: [spec.md](./spec.md)

## Prerequisites

> **Validation scope: Android-first.** Push cannot be tested in Expo Go on Android (SDK 53+ removed support), and this repo has no `eas.json` or dev-client setup. All scenarios below run on a physical Android device with an EAS development build. iOS validation is explicitly deferred until Apple Developer + APNs credentials exist.

- Expo SDK 57 EAS development build installed on a physical Android device (NOT Expo Go)
- `eas.json` with a `development` profile + EAS project ID in `app.json` (blocking Phase 0 prerequisite — see research R-011)
- Firebase project with FCM credentials uploaded via `eas credentials`
- Supabase project with:
  - `device_push_tokens` table created (see [data-model.md](./data-model.md))
  - `notification_events` table created (see [data-model.md](./data-model.md))
  - Order status notification trigger deployed (writes event rows only — no HTTP)
  - Database Webhook on `notification_events` INSERTs → Edge Function URL (dashboard *Integrations → Webhooks* or equivalent SQL; Authorization header configured on the webhook)
  - Notification dispatch Edge Function deployed
- At least two test accounts: one with `customer` role, one with `driver` role

## Setup Commands

```bash
# Phase 0 (blocking): EAS dev-build pipeline — must complete before any scenario
# 1. Create eas.json with a development profile (dev-client enabled)
# 2. Set the EAS project ID in app.json
# 3. Create a Firebase project, add the Android app, upload FCM key:
eas credentials
# 4. Build and install on a physical Android device:
eas build --profile development --platform android

# Install the expo-notifications package
npx expo install expo-notifications

# Apply database migrations (device_push_tokens, notification_events, triggers)
# (Run via Supabase CLI or dashboard SQL editor)
supabase db push

# Deploy the notification dispatch Edge Function
supabase functions deploy notify-order-status
```

## Validation Scenarios

### Scenario 1: Device Token Registration (User Story 3)

**Steps**:
1. Sign in as a `customer` account on Device A.
2. Place a first order (to trigger the permission prompt — FR-013).
3. Grant notification permission when prompted.
4. Verify in Supabase dashboard:
   ```sql
   SELECT * FROM device_push_tokens
   WHERE user_id = '<customer_user_id>' AND is_active = true;
   ```
   → Expect exactly one row with the device's Expo push token.

5. Sign in as the same customer on Device B, place another order.
6. Query again:
   ```sql
   SELECT count(*) FROM device_push_tokens
   WHERE user_id = '<customer_user_id>' AND is_active = true;
   ```
   → Expect 2 active rows (multi-device support — FR-003).

**Expected Outcome**: Both device tokens are registered and active.

---

### Scenario 2: Customer Order Lifecycle Notifications (User Story 1)

**Steps**:
1. Sign in as a customer on a registered device. Background the app.
2. Have a driver account claim the customer's pending order (transition: `pending → accepted`).
3. Verify the customer device receives a push notification with a human-readable title/body referencing the store name.
4. Advance the order through each status:
   - `accepted → preparing`
   - `preparing → out_for_delivery`
   - `out_for_delivery → delivered`
5. Verify a distinct push notification is received for each transition.
6. Tap any notification.

**Expected Outcome**:
- 4 distinct push notifications received (accepted, preparing, out_for_delivery, delivered).
- Tapping navigates to `/(customer)/orders/{orderId}` — the order detail screen.
- Verify via Supabase:
  ```sql
  SELECT event_type, dispatch_status FROM notification_events
  WHERE order_id = '<order_id>' AND target_role = 'customer'
  ORDER BY created_at;
  ```
  → Expect 4 rows with `dispatch_status = 'sent'`.

---

### Scenario 3: Driver Pool Notification (User Story 2)

**Steps**:
1. Sign in as a driver. Toggle to "Available". Grant notification permission when prompted. Background the app.
2. Sign in as a second driver. Toggle to "Available". Grant permission. Background the app.
3. Sign in as a third driver. Keep toggled "Offline".
4. Sign in as a fourth driver. Toggle to "Available", then have them claim an order (now holding an active delivery). Background the app.
5. Place a new order as a customer.
6. Verify:
   - Both Available drivers with no active delivery receive a push notification about the new order.
   - The Offline driver receives nothing.
   - The driver holding an active delivery receives nothing (pool-semantics parity — FR-008).
   - Notification body shows only pickup zone and order value (no customer PII — FR-010).
7. Have Driver A tap the notification.

**Expected Outcome**:
- 2 out of 4 drivers receive the notification.
- Tapping navigates to `/(driver)/available-orders` — the available orders pool.
- Verify notification body does NOT contain customer name, phone, address, or order items.

---

### Scenario 4: Sign-Out Token Deactivation (User Story 4)

**Steps**:
1. Sign in as User A on Device X. Register push token.
2. Sign out of User A on Device X.
3. Verify:
   ```sql
   SELECT is_active FROM device_push_tokens
   WHERE push_token = '<device_x_token>';
   ```
   → Expect `is_active = false`.
4. Trigger an order event for User A.
5. Verify Device X receives no notification.
6. Sign in as User B on Device X. Register push token.
7. Trigger an order event for User B.
8. Verify Device X receives User B's notification.
9. Trigger an order event for User A.
10. Verify Device X does NOT receive User A's notification.

**Expected Outcome**: Complete account isolation — no cross-user notification leakage.

---

### Scenario 5: Contextual Permission Prompting (User Story 5)

**Steps**:
1. Launch app as unauthenticated guest. Browse restaurants.
   → Verify: NO permission prompt is shown.
2. Sign in as a customer. Browse the menu.
   → Verify: NO permission prompt is shown.
3. Place first order successfully.
   → Verify: Permission prompt IS shown immediately after order confirmation.
4. Cancel/deny the prompt.
   → Verify: Full ordering and browsing functionality continues unimpacted.
5. Place a second order.
   → Verify: Permission prompt is NOT shown again (one-time trigger).

**Expected Outcome**: Permission prompt fires exactly once, at the first high-intent moment.

---

### Scenario 6: Foreground Notification Suppression (User Story 6)

**Steps**:
1. Sign in as a customer. Open the order detail screen for an active order.
2. Keep the app in the foreground.
3. Have a driver advance the order status.
4. Observe:
   → The order detail screen updates in real-time via Supabase Realtime.
   → NO OS notification banner appears.
   → NO in-app toast or snackbar appears.
5. Background the app.
6. Have a driver advance the order status again.
7. Observe:
   → An OS notification banner appears with sound/vibration.

**Expected Outcome**: Complete foreground suppression; background notifications work normally.

---

### Scenario 7: Cancellation Notification

**Steps**:
1. Place an order as a customer. Background the app.
2. Cancel the order (or have the system cancel it).
3. Verify the customer receives a distinct `order_cancelled` notification.
4. Tap the notification.

**Expected Outcome**: Cancellation notification received; tapping navigates to the order detail screen showing cancelled status.

---

### Scenario 8: Stale Token Pruning (Edge Case)

**Steps**:
1. Register a push token for a user.
2. Uninstall the app on that device (invalidating the token).
3. Trigger an order event for that user.
4. The Edge Function receives a `DeviceNotRegistered` error from Expo.
5. Verify:
   ```sql
   SELECT is_active FROM device_push_tokens
   WHERE push_token = '<invalidated_token>';
   ```
   → Expect `is_active = false`.

**Expected Outcome**: Invalid tokens are automatically deactivated; no future dispatch attempts to that token.

---

### Scenario 9: Order Release Notifications (User Story 1 + User Story 2)

**Steps**:
1. Customer places an order; Driver A (Available) claims it. Both background their apps.
2. Driver A releases the order with a reason (via `release_order`).
3. Verify the customer receives a distinct `order_released` notification ("finding a new driver" messaging).
4. Verify an eligible Available driver (Driver B, backgrounded, no active delivery) receives a `new_order_pool` notification for the re-entered order.
5. Verify via Supabase:
   ```sql
   SELECT event_type, target_role, dispatch_status FROM notification_events
   WHERE order_id = '<order_id>' AND event_type IN ('order_released', 'new_order_pool')
   ORDER BY created_at;
   ```
   → Expect one `order_released` row (target_role `customer`) and one `new_order_pool` row (target_role `driver`), both `sent`.
6. Tap the customer notification → navigates to `/(customer)/orders/{orderId}` showing pending status.

**Expected Outcome**: Release produces both dispatches from a single status regression; no silent regression to pending.

---

## Verification Checklist

| # | Criterion | Scenario | Status |
|---|-----------|----------|--------|
| 1 | Token registration with upsert | Scenario 1 | ☐ |
| 2 | Multi-device registration | Scenario 1 | ☐ |
| 3 | Customer lifecycle notifications (all 6 statuses) | Scenario 2, 7, 9 | ☐ |
| 4 | Deep-link to order detail on tap | Scenario 2 | ☐ |
| 5 | Driver pool notification (eligible Available only) | Scenario 3, 9 | ☐ |
| 6 | Driver pool notification privacy (no PII) | Scenario 3 | ☐ |
| 7 | Deep-link to available orders on tap | Scenario 3 | ☐ |
| 8 | Token deactivation on sign-out | Scenario 4 | ☐ |
| 9 | No cross-user notification leakage | Scenario 4 | ☐ |
| 10 | Permission prompt at first order (customer) | Scenario 5 | ☐ |
| 11 | Permission prompt at first toggle (driver) | Scenario 5 | ☐ |
| 12 | No prompt on cold launch or guest browsing | Scenario 5 | ☐ |
| 13 | Full functionality with permission denied | Scenario 5 | ☐ |
| 14 | Foreground suppression (no OS banner, no toast) | Scenario 6 | ☐ |
| 15 | Background notifications with sound/vibration | Scenario 6 | ☐ |
| 16 | Cancellation notification | Scenario 7 | ☐ |
| 17 | Stale token pruning | Scenario 8 | ☐ |
| 18 | Release: customer notified + pool re-push | Scenario 9 | ☐ |
| 19 | Driver with active delivery excluded from pool push | Scenario 3 | ☐ |
| 20 | Notifications dispatched within 3s of DB change (SC-001; cold-start exception noted) | Scenario 2, 3 | ☐ |
| 21 | Bilingual notification content (AR/EN) | Scenario 2, 3 | ☐ |
