# Quickstart Validation Guide: Error Handling & Resilience

**Feature Branch**: `012-error-handling-resilience`  
**Date**: 2026-10-22  
**Spec**: [specs/012-error-handling-resilience/spec.md](spec.md)

This document provides step-by-step runnable scenarios to validate each of the 8 user stories in the Error Handling & Resilience feature.

---

## Prerequisites
- Node.js & pnpm installed.
- Expo Dev Client or Android Emulator / iOS Simulator running.
- Supabase local instance or development project configured in `.env`.

---

## Scenario 1: Arabic Error Messages (User Story 1)

### Goal
Ensure backend errors and codes never display raw technical strings or codes (e.g. `STORE_CLOSED`, `42501`) to the user.

### Verification Steps
1. In the database, set an active restaurant's `is_open` flag to `false`:
   ```sql
   UPDATE stores SET is_open = false WHERE id = '<STORE_ID>';
   ```
2. In the app, navigate to that store or attempt to place an order from it.
3. Tap "تأكيد الطلب" (Confirm Order).
4. **Expected Outcome**:
   - Alert appears displaying: "المتجر مغلق حالياً ولا يستقبل طلبات جديدة."
   - The raw code `STORE_CLOSED` is nowhere visible in the alert or screen.
   - If running in development (`__DEV__`), verify Metro console logs the classified error details.
5. In presentation code, run static analysis check:
   ```bash
   grep -rn 'error.message' src/app src/features/*/presentation
   ```
   **Expected Outcome**: Zero matches where raw `error.message` is rendered in JSX or passed to `showAlert`.

---

## Scenario 2: Network Awareness & Foreground Refetch (User Story 2)

### Goal
Validate automatic query pausing during offline states, explicit offline screen state, and automatic refetch upon reconnection and background-to-foreground transitions.

### Verification Steps
1. Navigate to `/orders` or `/active-order` while online with loaded data.
2. Enable Airplane Mode (offline).
3. Verify previously loaded data remains fully visible with no infinite blocking spinner.
4. Open a screen without cached data while in Airplane Mode.
5. **Expected Outcome**:
   - Explicit Arabic offline state appears: "لا يتوفر اتصال بالإنترنت" with an "إعادة المحاولة" button.
6. Disable Airplane Mode (restore connectivity).
7. **Expected Outcome**:
   - Paused queries automatically resume and fetch fresh data within 5 seconds without user intervention.
8. Background the app for 35 seconds (exceeding 30s `staleTime`), then bring it back to foreground.
9. **Expected Outcome**:
   - Stale queries automatically refetch fresh data within 3 seconds.

---

## Scenario 3: Writes with Unknown Outcome (User Story 3)

### Goal
Verify that lost network responses during write mutations do not show definitive failure alerts, preserve idempotency keys, and provide safe recovery paths.

### Verification Steps (Order Placement)
1. Add items to cart and proceed to `/checkout`.
2. Tap "تأكيد الطلب" and immediately drop the internet connection (Airplane Mode on) before response arrives.
3. **Expected Outcome**:
   - App remains on `/checkout`.
   - Alert appears with title: "تعذر التحقق من حالة الطلب".
   - Actions provided: "إعادة المحاولة" (Retry) and "عرض طلباتي" (View Orders).
4. Re-enable network connectivity.
5. Tap "إعادة المحاولة":
   - Order submits with the identical persisted `idempotencyKey`.
   - Backend idempotently returns the order without creating a duplicate.
   - User transitions to order tracking screen.

### Verification Steps (Driver Claim Conflict)
1. Simulate a driver claiming an order where a network timeout occurs after DB insert.
2. Driver retries claim; PostgreSQL returns code `23505` ("Driver already has an active order").
3. **Expected Outcome**:
   - The app refetches the driver's active order.
   - If it matches the order, the app transitions smoothly to `/active-order` as a success.
   - If it is a different order, an alert appears with action "عرض الطلب النشط" leading directly to `/active-order`.

---

## Scenario 4: Realtime Disconnect & Recovery (User Story 4)

### Goal
Verify that disconnecting and reconnecting Realtime channels triggers query invalidation to catch up on missed status updates.

### Verification Steps
1. As a customer, open an active order detail screen (`/orders/<ID>`).
2. Disconnect network for 15 seconds.
3. While disconnected, update the order status in Supabase SQL editor:
   ```sql
   UPDATE orders SET status = 'on_the_way' WHERE id = '<ORDER_ID>';
   ```
4. Reconnect the network.
5. **Expected Outcome**:
   - When the Realtime channel reports `SUBSCRIBED` upon reconnection, query cache invalidation fires automatically.
   - Screen updates to show "on_the_way" without manual pull-to-refresh.

---

## Scenario 5: Root Error Boundary (User Story 5)

### Goal
Ensure fatal render errors display the Arabic zero-dependency recovery boundary rather than a white screen.

### Verification Steps
1. Temporarily insert a throw inside a test screen component (e.g. `throw new Error('Test Crash');`).
2. Navigate to that screen.
3. **Expected Outcome**:
   - Dark-themed recovery screen renders immediately.
   - Title: "حدث خطأ غير متوقع".
   - Primary button: "إعادة المحاولة" (attempts re-render).
   - Secondary button: "العودة للرئيسية" (navigates safely back to `/`).
   - If in `__DEV__`, expandable technical error details (name, message, stack) appear.
4. Tap "العودة للرئيسية":
   - App successfully navigates to home screen (`/`) and resets boundary error state.

---

## Scenario 6: Cart Hydration at Startup (User Story 6)

### Goal
Ensure persisted cart contents are loaded from AsyncStorage before the splash screen hides on cold start.

### Verification Steps
1. Add 2 items to the shopping cart.
2. Force quit the application completely.
3. Re-launch the app.
4. **Expected Outcome**:
   - Animated splash screen displays during hydration.
   - When the splash screen dismisses, the cart icon badge and `/cart` screen immediately display 2 items.
   - No flash of an empty cart occurs.

---

## Scenario 7: Cart Revalidation Before Checkout (User Story 7)

### Goal
Verify that price changes or discontinued items are surfaced in a blocking sheet before the customer can confirm an order.

### Verification Steps
1. Add a product to the cart at price 50 SAR.
2. In Supabase, update the product price to 65 SAR:
   ```sql
   UPDATE products SET price = 65.00 WHERE id = '<PRODUCT_ID>';
   ```
3. Navigate to `/checkout`.
4. **Expected Outcome**:
   - Blocking bottom-sheet or modal appears showing:
     - Product name.
     - Old price: 50 SAR → New price: 65 SAR.
     - Updated subtotal.
   - "تأكيد الطلب" button is disabled until explicit consent.
5. Tap "الموافقة والمتابعة" (Accept & Proceed):
   - Cart item price updates in Redux.
   - Sheet closes and order confirmation button becomes active.

---

## Scenario 8: Session Expiry Handling (User Story 8)

### Goal
Gracefully transition expired sessions to guest mode or login with a clean Arabic dialog.

### Verification Steps
1. While logged in, manually delete the user's refresh token or trigger session expiration in Supabase:
   ```typescript
   await supabase.auth.signOut();
   ```
2. Trigger an authenticated query or action.
3. **Expected Outcome**:
   - Arabic dialog appears: "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى".
   - Options provided: "تسجيل الدخول" and "متابعة كزائر".
   - Tapping "متابعة كزائر" cleanly purges customer server cache and returns to `/` in guest mode without errors.
