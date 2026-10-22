# Feature Specification: Error Handling & Resilience

**Feature Branch**: `012-error-handling-resilience`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Error-handling and resilience pass over the existing app: user-facing Arabic error messages instead of raw server strings, correct network/foreground behavior for server state, Realtime recovery after disconnects, safe handling of writes whose outcome is unknown, a root error boundary, cart hydration at startup, and cart price/availability revalidation before checkout."

## Clarifications

### Session 2026-10-22

- Q: How should the checkout screen handle price changes detected during cart revalidation before order confirmation? → A: Show a blocking modal/sheet detailing price changes requiring explicit customer acceptance before enabling confirmation.
- Q: What recovery actions should the Root Error Boundary screen provide to the user when a fatal render crash occurs? → A: Dual actions — a primary "إعادة المحاولة" (Retry re-render) and a fallback "العودة للرئيسية" (Navigate to Home).
- Q: How should the checkout screen present recovery options when an order confirmation write encounters a network failure with an unknown outcome? → A: Stay on checkout with an alert offering two actions: "إعادة المحاولة" (Retry idempotently) and "عرض طلباتي" (View Orders).
- Q: When an authentication session expires during active use, how should the app present the notification and transition the user? → A: Display an Arabic dialog with two options: "تسجيل الدخول" (Go to Login) and "متابعة كزائر" (Continue as Guest).
- Q: When a driver retries claim_order and returns "already has an active order" (23505) for a DIFFERENT order, how should the app respond? → A: Show an alert informing the driver of their existing order with an action to navigate directly to it: "عرض الطلب النشط".

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Arabic Error Messages Instead of Raw Server Strings (Priority: P1)

A customer or driver encounters a server error (e.g., store closed, product unavailable, order cannot be cancelled). Instead of seeing a raw English error code or database message, they see a clear, helpful Arabic message explaining what happened and what they can do next.

**Why this priority**: Raw error strings are the most visible quality issue. Every user who hits any error today sees unintelligible text, eroding trust and causing unnecessary support contacts.

**Independent Test**: Trigger each known server error (place an order against a closed store, cancel an already-cancelled order, try to claim an already-claimed order) and verify the screen shows a human-readable Arabic message, never a raw code.

**Acceptance Scenarios**:

1. **Given** a customer on the checkout screen, **When** they confirm an order and the store is closed, **Then** they see an Arabic message like "المتجر مغلق حالياً، حاول لاحقاً" — never the raw code `STORE_CLOSED`.
2. **Given** a customer on the checkout screen, **When** a product in their cart is no longer available, **Then** they see an Arabic message identifying the unavailable product — never `PRODUCT_UNAVAILABLE`.
3. **Given** a driver on the available-orders screen, **When** they try to claim an order that another driver already claimed, **Then** they see an Arabic message like "تم قبول هذا الطلب من كابتن آخر" — never a raw 23505 or English text.
4. **Given** a customer trying to cancel an order, **When** the order is no longer cancellable, **Then** they see an Arabic message — never `ORDER_CANNOT_BE_CANCELLED`.
5. **Given** any user on any screen, **When** any server error occurs, **Then** `grep -r 'error.message'` across presentation code finds zero instances where a raw backend string is displayed to the user.
6. **Given** development mode, **When** any error occurs, **Then** the raw error is logged to the console for debugging purposes.

---

### User Story 2 — Network Awareness and Foreground Refetch (Priority: P1)

When the user loses network connectivity, data-fetching queries pause and show cached data (or an explicit offline state if no cache exists). When connectivity returns, paused queries resume automatically. When the app returns from the background, stale queries refetch to show fresh data.

**Why this priority**: Without this, the app appears frozen or shows stale data after connectivity changes or backgrounding, which is a fundamental reliability issue on mobile.

**Independent Test**: Toggle airplane mode while viewing an order detail screen; verify queries pause (no spinner, cached data visible or explicit offline state). Disable airplane mode; verify queries refetch. Background the app for 30+ seconds, return, verify visible data refreshes.

**Acceptance Scenarios**:

1. **Given** a user viewing an order-detail screen with cached data, **When** they lose connectivity, **Then** the cached data remains visible and no endless spinner appears.
2. **Given** a user viewing a data screen with no cached data, **When** they are offline, **Then** they see an explicit offline state with a retry action — not an endless spinner.
3. **Given** a user who was offline, **When** connectivity returns, **Then** paused queries resume and the screen updates with fresh data without user action.
4. **Given** a user who backgrounded the app for longer than the stale time, **When** they return to the foreground, **Then** stale queries refetch automatically.
5. **Given** a user triggering a mutation (place order, claim order, cancel) while offline, **Then** the mutation executes immediately, fails fast with an Arabic network error message, and does not queue or auto-retry later.

---

### User Story 3 — Writes with Unknown Outcome (Priority: P1)

When a write operation (place order, claim order, cancel order, release order, advance status) fails due to a network error, the app does not claim definitive failure. It tells the user the connection failed, invalidates related queries so the real state appears, and makes retrying safe.

**Why this priority**: A lost write response can mean the operation actually succeeded. Telling the user it "failed" causes duplicate actions, confusion, and support burden. This is a data-integrity and trust issue.

**Independent Test**: Simulate a network drop immediately after tapping "confirm order." Verify the message says the connection failed (not "order failed") and that retrying does not duplicate the order. For driver claim: lose the response, retry, verify the driver sees their active order even if the retry returns "already has an active order."

**Acceptance Scenarios**:

1. **Given** a customer who tapped "confirm order," **When** the network drops and the response is lost, **Then** the customer remains on the checkout screen and sees an Arabic alert dialog explaining the connection failed and that retrying is safe; the dialog provides two actions: "إعادة المحاولة" (retries submission safely with the same idempotency key) and "عرض طلباتي" (navigates to Orders to check if the order was created). Related queries are invalidated so an active order appears if created.
2. **Given** a driver who tapped "claim," **When** the response is lost and a retry returns "already has an active order," **Then** the system checks if this order is the driver's active order and shows it — treating it as success. If their active order is a different order, the system displays an alert with a direct action "عرض الطلب النشط" to navigate to their current active order.
3. **Given** a customer who tapped "cancel order," **When** the first attempt succeeded but the response was lost, **Then** a retry that returns `ORDER_CANNOT_BE_CANCELLED` triggers a refetch, and the screen shows the current (cancelled) state calmly — not an error dialog.
4. **Given** a driver who tapped "advance status," **When** the first attempt succeeded but the response was lost, **Then** a retry returning `ORDER_STATUS_CHANGED` triggers a refetch and displays the current state — not an error.
5. **Given** any mutation, **When** the outcome is unknown, **Then** no automatic retry loop or background queue fires. The user must explicitly retry.

---

### User Story 4 — Realtime Recovery After Disconnects (Priority: P2)

When a Realtime channel disconnects (due to network loss, server issues, or backgrounding), and then reconnects, the system automatically refetches authoritative state from the server. No missed events are silently lost.

**Why this priority**: Realtime channels do not replay missed events. Without recovery, a user watching an order detail could miss status changes that happened during disconnection, seeing permanently stale data.

**Independent Test**: Open an order-detail screen, toggle airplane mode, change the order status server-side while offline, reconnect — verify the screen shows the new status without user action.

**Acceptance Scenarios**:

1. **Given** a customer viewing an order-detail screen, **When** the Realtime channel disconnects and then reconnects, **Then** the order data refetches from the server and shows the current status.
2. **Given** a driver viewing their active order, **When** a Realtime disconnect and reconnect occurs, **Then** the active order data refetches automatically.
3. **Given** a Realtime subscription, **When** the channel reports CHANNEL_ERROR or TIMED_OUT followed by SUBSCRIBED, **Then** a refetch of the related queries is triggered.
4. **Given** channel lifecycle management, **When** a subscription is cleaned up, **Then** channels are removed properly and no duplicate channels leak across reconnects.

---

### User Story 5 — Root Error Boundary (Priority: P2)

When an unexpected render crash occurs anywhere in the app, the user sees a friendly Arabic recovery screen with a retry action — not a white screen or a raw JavaScript stack trace.

**Why this priority**: Unhandled render errors currently crash to a blank screen. A boundary provides a graceful recovery path and maintains user confidence.

**Independent Test**: Force a render crash (temporary dev-only trigger); verify the Arabic fallback screen appears with a working retry button. Verify it renders correctly even if theme/font providers are unavailable.

**Acceptance Scenarios**:

1. **Given** any screen in the app, **When** an unrecoverable render error occurs, **Then** an Arabic-language error screen appears with a clear retry action.
2. **Given** the error boundary, **When** it renders, **Then** it does not depend on ThemeProvider, Redux, TanStack Query, AuthProvider, or custom fonts — because these may be unavailable or the cause of the crash.
3. **Given** development mode, **When** the error boundary activates, **Then** technical error details are shown below the user-friendly message for debugging.
4. **Given** the user facing a fatal render crash, **When** the error boundary displays, **Then** it provides two recovery actions: a primary "إعادة المحاولة" (attempts to re-render the current component tree) and a fallback "العودة للرئيسية" (resets boundary error state and navigates to the home screen '/').

---

### User Story 6 — Cart Hydration at Startup (Priority: P2)

When the app cold-starts and the user navigates directly to the cart or checkout screen, the persisted cart (including the idempotency key/fingerprint from the previous feature) is fully loaded before the splash screen hides. The user never sees a flash of an empty cart.

**Why this priority**: Without startup hydration gating, a user reopening the app to complete a pending checkout sees an empty cart momentarily, which is confusing and may cause them to re-add items.

**Independent Test**: Force-quit the app with items in the cart. Reopen and navigate straight to /cart or /checkout. Verify the cart is populated on first render — no flash of empty state.

**Acceptance Scenarios**:

1. **Given** a user who had items in their cart, **When** they cold-start the app and navigate to /cart, **Then** the cart contents (including persisted idempotency key/fingerprint) are present on first render.
2. **Given** cart hydration, **When** hydration throws an error or hangs beyond a reasonable timeout, **Then** the app continues with an empty cart and logs the error in development — startup is never blocked indefinitely.
3. **Given** cart hydration, **When** startup completes, **Then** the splash screen does not hide until hydration finishes (or times out), alongside the existing gates (session resolution, fonts).

---

### User Story 7 — Cart Revalidation Before Checkout (Priority: P2)

When a customer enters the checkout screen (and optionally on cart screen mount), the system fetches current prices and availability for every item in the cart. If prices have changed or items are unavailable, the customer is informed before confirming — they are never silently charged a different amount.

**Why this priority**: The cart stores price snapshots from add-to-cart time, but the server charges current prices. Without revalidation, a customer could be charged more than they expected, damaging trust.

**Independent Test**: Add items to cart, change a product's price in the database, open checkout — verify the customer sees a notice about the price change and updated totals before they can confirm. Mark a product unavailable, open checkout — verify the confirm button is disabled until the item is removed.

**Acceptance Scenarios**:

1. **Given** a cart with items, **When** the customer enters checkout and a product's price has changed since it was added, **Then** a blocking modal or bottom-sheet lists old versus new prices and new totals; the customer must explicitly tap an acceptance button to update cart snapshots and enable order confirmation.
2. **Given** a cart with items, **When** a product or add-on is no longer available, **Then** the unavailable item is flagged in the cart with a one-tap remove action, and the confirm button is disabled until all unavailable items are resolved.
3. **Given** a cart with items, **When** the cart's store is now closed, **Then** the customer is informed that the store is closed and checkout is blocked.
4. **Given** revalidation, **When** it completes with no changes, **Then** checkout proceeds normally with no interruption.
5. **Given** the revalidation mechanism, **When** an "Order Again" revalidation use case already exists in the codebase, **Then** it is reused — a second revalidation path is not built.

---

### User Story 8 — Session Expiry Handling (Priority: P2)

When a user's authentication session expires or becomes invalid, the app returns them to guest browsing with a single clear Arabic message — not a raw 42501 or a cascade of errors.

**Why this priority**: Session expiry is an inevitable event. Without graceful handling, it causes confusing errors across multiple screens simultaneously.

**Independent Test**: Invalidate the user's session server-side (or let the JWT expire). Verify the app shows one clear Arabic message and transitions to guest browsing using the existing sign-out sequence (cache clearing, push-token deactivation).

**Acceptance Scenarios**:

1. **Given** a user with an expired or invalidated session, **When** they perform any authenticated action or token auto-refresh fails, **Then** an Arabic dialog appears explaining "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى" with two options: "تسجيل الدخول" (navigates to Login) and "متابعة كزائر" (navigates to Home in guest mode). The existing sign-out sequence executes cleanly.
2. **Given** the sign-out sequence, **When** it executes due to session expiry, **Then** it tolerates an already-invalid session (e.g., push-token deactivation does not fail if the session is gone).
3. **Given** a protected action in progress, **When** the session expires, **Then** the flow routes through the existing `useRequireAuth` mechanism.

---

### Edge Cases

- What happens when the error classifier encounters an unknown/unmapped error code? → It falls through to the generic "unexpected" kind with a generic Arabic message ("حدث خطأ غير متوقع، حاول مرة أخرى").
- What happens when the Supabase auth token auto-refresh fails silently? → The same session-expiry handling kicks in on the next authenticated request.
- What happens when cart hydration data is corrupted (invalid JSON in AsyncStorage)? → Hydration fails gracefully, the app starts with an empty cart, and the error is logged in development.
- What happens when multiple Realtime channels disconnect and reconnect simultaneously? → Each channel independently triggers its own refetch; no global coordination is needed.
- What happens when a revalidation fetch itself fails (network error while checking prices)? → Checkout proceeds with a warning that prices could not be verified, but the confirm button remains enabled (the server is the final authority).
- What happens when the customer dismisses or rejects the price change modal? → The customer is returned to the cart screen to review or adjust items; order confirmation remains blocked.
- What happens if tapping "إعادة المحاولة" on the root error boundary immediately crashes again? → The user can tap the secondary "العودة للرئيسية" action to escape the broken route, reset error state, and return safely to the home screen.
- What happens if the customer taps "عرض طلباتي" after a lost-response order creation? → The customer is navigated to `/orders`, where invalidated queries fetch the latest list; if the order was created, it appears as an active order; if not, the cart remains intact for them to return and complete checkout.
- What happens when the user dismisses the session expiry dialog without selecting an option? → It defaults to "متابعة كزائر", safely returning the user to the home screen in guest browsing mode.
- What happens if a driver claims an order while another order was already assigned to them? → The system checks their active order, determines it does not match the claimed order, and presents an alert with "عرض الطلب النشط" directing them to complete their current assignment.
- What happens when the online/offline state is unknown (null/undefined from the connectivity API)? → The system treats unknown as online and does not block any action.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST classify every backend error into a typed error with a specific `kind`, following the existing `AuthErrorType { kind }` pattern. Classification happens in the infrastructure layer, never in presentation.
- **FR-002**: System MUST maintain a centralized Arabic message dictionary per feature, keyed by error kind, plus shared generic messages. No inline error strings in components.
- **FR-003**: Presentation MUST never parse error strings and MUST never display `error.message` directly to users.
- **FR-004**: System MUST wire TanStack Query's `onlineManager` to the device's real connectivity signal and `focusManager` to `AppState` changes, in the app-level shared/lib setup.
- **FR-005**: System MUST set `refetchOnWindowFocus` to `true` on the query client so stale queries refetch when the app returns from the background.
- **FR-006**: System MUST set mutations' `networkMode` to `'always'` so writes execute immediately and fail fast — never pausing and auto-firing when connectivity returns.
- **FR-007**: System MUST show an explicit offline state (with retry action) for data screens that have no cached data while offline, using `fetchStatus === 'paused'` combined with absence of data.
- **FR-008**: System MUST treat network errors on write operations as "outcome unknown" — never claiming definitive failure. Related queries MUST be invalidated so the real state appears.
- **FR-009**: For `place_order` specifically, when a network error produces an unknown outcome, the system MUST keep the customer on checkout and display an Arabic dialog offering two actions: "إعادة المحاولة" (retries safely with the same idempotency key) and "عرض طلباتي" (navigates to customer orders list). The orders list queries MUST be invalidated.
- **FR-010**: For `claim_order`, when a retry returns "already has an active order" (23505), the system MUST refetch the driver's active order. If the active order matches the claimed order, treat as success and show it; if it is a different order, display an Arabic alert informing them ("لديك طلب نشط بالفعل قيد التنفيذ") with an action button "عرض الطلب النشط" to navigate directly to it.
- **FR-011**: For `cancel_order`, `release_order`, and `advance_order_status`, state-changed conflicts after a lost-success retry (ORDER_CANNOT_BE_CANCELLED, ORDER_NOT_ACTIVE_OR_NOT_ASSIGNED, ORDER_STATUS_CHANGED) MUST trigger a refetch and display the current state calmly.
- **FR-012**: Every Realtime subscription MUST observe channel status (SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED). On return to SUBSCRIBED after disconnection, it MUST trigger a refetch of related queries.
- **FR-013**: Realtime reconnection MUST be handled behind the existing domain interfaces (OrderRealtimeService, DriverRealtimeService) — no Supabase channel-status types in Domain or Application.
- **FR-014**: Channels MUST be properly removed on unsubscribe. No duplicate channels may leak across reconnects.
- **FR-015**: System MUST export a root `ErrorBoundary` from the root layout following Expo Router conventions, showing an Arabic recovery screen with two recovery actions: a primary "إعادة المحاولة" (retry re-render) and a fallback "العودة للرئيسية" (reset error boundary and navigate to home screen '/').
- **FR-016**: The root error boundary fallback MUST NOT depend on ThemeProvider, Redux, TanStack Query, AuthProvider, or custom fonts.
- **FR-017**: System MUST await cart rehydration (including persisted idempotency key/fingerprint) as part of startup gating, before the splash screen hides.
- **FR-018**: Cart hydration MUST never block startup indefinitely — if it throws or hangs, continue with an empty cart and log in development.
- **FR-019**: System MUST revalidate cart item prices and availability on entering the checkout screen by fetching current data from the server.
- **FR-020**: When revalidation detects price changes, the system MUST display a blocking modal or bottom-sheet detailing each item's old and new price and the updated total. Cart snapshots MUST be updated to current prices and the confirm order button MUST remain disabled until the customer explicitly accepts the updated prices.
- **FR-021**: When revalidation detects unavailable items, those items MUST be flagged with a one-tap remove action, and the confirm button MUST be disabled until resolved.
- **FR-022**: If Supabase auth `startAutoRefresh()`/`stopAutoRefresh()` is not tied to `AppState`, it MUST be wired. If auth refresh fails and the session is lost, the existing sign-out sequence MUST execute, displaying an Arabic dialog offering "تسجيل الدخول" (navigates to Login) and "متابعة كزائر" (navigates to Home in guest mode).
- **FR-023**: The sign-out sequence MUST tolerate an already-invalid session at every step.
- **FR-024**: Mutations MUST NOT auto-retry (`retry: 0` confirmed from previous feature) and MUST NOT queue while offline.
- **FR-025**: Structured results that are not exceptions (e.g., `claim_order {claimed:false}`, `validate_coupon {is_valid:false, rejection_reason}`) MUST also receive Arabic message mappings in the UI.
- **FR-026**: The Arabic message dictionaries MUST be structured so another locale can be added later, without introducing an i18n framework in this feature.
- **FR-027**: In development mode only, raw error details MUST be logged to the console. No remote error-reporting service in this feature.

### Key Entities

- **AppError**: A typed error with a `kind` property that classifies the error category. Generic kinds (network, session_expired, permission_denied, unexpected) live in shared. Business-specific kinds live in each feature's domain layer.
- **Error Message Dictionary**: A per-feature keyed mapping from error kind to Arabic user-facing message. Each message describes what happened and suggests what to do next.
- **Cart Revalidation Result**: The output of comparing current server prices/availability against the cart's stored snapshots. Contains lists of price changes, unavailable items, and store-closed status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero instances of raw backend error strings displayed to users — verified by grep across all presentation code.
- **SC-002**: 100% of known server error codes (from the live function inventory) are mapped to a typed kind and an Arabic message.
- **SC-003**: Offline-to-online transitions result in automatic data refresh within 5 seconds of connectivity restoration, without user action.
- **SC-004**: Background-to-foreground transitions result in stale query refresh within 3 seconds, without user action.
- **SC-005**: Realtime channel disconnection and reconnection results in authoritative data refetch without user action — verified by changing server state during disconnection.
- **SC-006**: Cold start with a persisted cart shows cart contents on first render — no flash of empty state.
- **SC-007**: Price changes between add-to-cart and checkout are surfaced to the customer before order confirmation in 100% of cases.
- **SC-008**: A forced render crash shows the Arabic recovery boundary with working retry — verified on a physical device.
- **SC-009**: All write operations with lost responses produce an "unknown outcome" message (never definitive failure) and make retrying safe — verified for place_order, claim_order, cancel_order, release_order, and advance_order_status.
- **SC-010**: Architecture integrity: Domain/Application imports no Supabase, Expo, AsyncStorage, Redux, or TanStack Query; shared/ imports nothing from features — verified by static analysis.

## Assumptions

- The existing codebase follows the Sari3 constitution (feature-first Clean Architecture, dependency direction, state ownership rules) and this feature will maintain compliance.
- The `order-placement-idempotency` feature (011) has been completed, including the persisted `{key, fingerprint}` in the cart store and `mutations.retry = 0`.
- All existing Supabase RPCs (`place_order`, `claim_order`, `release_order`, `cancel_order`, `advance_order_status`, `validate_coupon`, `decline_order`, `toggle_driver_availability`) will not be modified — their error messages and return shapes remain as-is.
- No new database migrations are expected. If one is found to be necessary, it will be raised as an open decision for approval.
- The app targets React Native + Expo SDK 57 with Supabase as the backend.
- `expo-network` or the existing network status service will provide the connectivity signal for TanStack Query's `onlineManager`.
- The existing shared `ErrorView`/`ErrorState` component will be reused for full-screen/inline error displays.
- No test framework exists in the project; proposing one is out of scope for this feature.
- Cart revalidation uses the existing product repository; a batch-read method will be added only if none exists.

## Out of Scope

- Offline-first architecture or write queues
- Automatic retry of write operations
- Remote crash/error reporting service (Sentry, etc.)
- An i18n framework or English strings
- A global offline banner
- Applied-coupon persistence across restarts
- New RLS/RPC behavior or database migrations (unless surfaced as an open decision)
- A test framework
- Per-screen error boundaries
- Changes to `claim_order`, `release_order`, `cancel_order`, `advance_order_status`, coupon logic, notification triggers, or pool-signal triggers
