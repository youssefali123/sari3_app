# Feature Specification: Push Notifications

**Feature Branch**: `004-push-notifications`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "create a specification for i want to create and all details in this file: @[mds/push-notifications.md]"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer Order Lifecycle Notifications (Priority: P1)

A customer places an order and leaves the app to attend to other tasks. As their order progresses through its lifecycle, the customer receives distinct, human-readable push notifications on their device at each key milestone: when a driver claims the order (`accepted`), when the restaurant begins preparing the food (`preparing`), when the driver is on the road (`out_for_delivery`), when the order arrives (`delivered`), if the order is cancelled (`cancelled`), and if the assigned driver releases the order back to the pool (`released` — the customer is told a new driver is being found). Tapping any of these notifications brings the customer directly to the live detail/tracking screen for that specific order.

**Why this priority**: Real-time order progress updates are the core customer value for notifications. Customers should not have to leave the app open or repeatedly check the screen to know their delivery status.

**Independent Test**: Can be tested end-to-end by creating an order, updating the order lifecycle state on the server, and verifying that the customer's registered device receives each distinct, human-readable notification and navigates directly to that order's detail screen when tapped.

**Acceptance Scenarios**:

1. **Given** a customer has placed an order and is outside the app, **When** a driver accepts the order, **Then** the customer receives a push notification announcing that a driver has claimed the order.
2. **Given** an accepted order moves to "preparing", "out_for_delivery", and "delivered", **When** each transition occurs on the server, **Then** the customer receives a separate, human-readable push notification corresponding to that transition (not a generic "order updated" alert). If the order is cancelled at any point, the customer receives a distinct cancellation notification.
3. **Given** a customer receives an order lifecycle push notification, **When** they tap the notification, **Then** the app opens directly to that specific order's detail/tracking screen.
4. **Given** a customer is signed in on multiple registered devices (e.g. phone and tablet), **When** an order lifecycle update fires, **Then** all of the customer's registered devices receive the push notification.
5. **Given** the assigned driver releases the customer's order back to the pool (status regresses to "pending"), **When** the release is committed on the server, **Then** the customer receives a distinct push notification explaining that their driver released the order and a new driver is being found.

---

### User Story 2 - Available Driver Pool Notifications (Priority: P1)

A driver is signed into the driver application and toggled "Available" (online), but has the app backgrounded while waiting for delivery requests. When a customer places an order and it enters the unclaimed pending pool — including when a released order re-enters the pool — all eligible Available drivers receive an immediate push notification alerting them that a new order is ready to be claimed. A driver who is currently toggled "Offline", or who is already holding an active delivery, receives no push notification. When an Available driver taps the notification, the driver app opens directly to the available orders pool so they can review and accept the order immediately.

**Why this priority**: Timely order discovery is the engine of driver fulfillment. If drivers must keep the app foregrounded continuously, delivery response times degrade and battery usage increases.

**Independent Test**: Can be tested by placing a new order into the pending pool with one Available driver and one Offline driver registered. Verify the Available driver receives the push notification and opens the pool on tap, while the Offline driver receives nothing.

**Acceptance Scenarios**:

1. **Given** a driver has the driver role, is signed in, is toggled to "Available", and is not holding an active delivery, **When** a new order enters the unclaimed pending pool, **Then** the driver receives a push notification alerting them of a new available order.
2. **Given** a driver is toggled to "Offline" or is already holding an active delivery, **When** a new order enters the pending pool, **Then** the driver receives no push notification.
3. **Given** an Available driver receives a new order push notification, **When** they tap the notification, **Then** the driver app opens directly to the available orders pool screen.
4. **Given** multiple drivers are currently Available, **When** a new order becomes available, **Then** all Available drivers receive the push notification simultaneously.
5. **Given** an assigned driver releases an order back to the pool, **When** the release is committed on the server, **Then** all eligible Available drivers receive a push notification for the re-entered order, exactly as for a newly placed order.

---

### User Story 3 - Device Push Token Registration & Multi-Device Support (Priority: P1)

When an authenticated user (customer or driver) opens the app and grants notification permissions, the client application registers the device's push notification token with the server, associating it with their user account. The server supports multi-device registration: a user may sign in from multiple devices simultaneously, and all registered devices remain linked to the user account to receive subsequent alerts.

**Why this priority**: Server-side token association is the foundational transport requirement. Without registered tokens linked to user accounts, no server-triggered notifications can be delivered.

**Independent Test**: Can be tested by signing into the same user account on Device A and Device B, verifying that both tokens are registered on the server associated with that user ID, and confirming that a notification sent to that user ID arrives on both devices.

**Acceptance Scenarios**:

1. **Given** a user signs in to their account on a device, **When** notification permission is granted, **Then** the client registers the device's push token with the server associated with the authenticated user ID.
2. **Given** a user is already signed in on Device A, **When** they sign in on Device B and grant permission, **Then** Device B's token is registered alongside Device A's token without invalidating or removing Device A.
3. **Given** a device token is already registered for a user, **When** the user opens the app or re-authenticates on that same device, **Then** the existing token registration is confirmed or refreshed without creating duplicate records.

---

### User Story 4 - Push Token Deactivation on Sign-Out (Priority: P2)

When a user signs out of the app on a device, the registration associating that device's push token with the user's account is deactivated or removed on the server as an explicit part of the sign-out sequence. If a different user subsequently signs into the app on that same physical device, they never receive notifications intended for the previous user.

**Why this priority**: Privacy and data protection. Order updates contain sensitive information (delivery addresses, contact names, order contents). Notifications must never leak across user accounts on shared devices.

**Independent Test**: Can be tested by signing in as User A, signing out, and triggering an order update for User A. Verify the device does not receive the notification. Then sign in as User B on the same device and verify only User B's notifications are received.

**Acceptance Scenarios**:

1. **Given** an authenticated user initiates sign-out, **When** the sign-out sequence executes, **Then** the device's push token registration for that user account is deactivated or deleted on the server before or concurrently with session termination.
2. **Given** a user has signed out of a device, **When** a new order event occurs for that user, **Then** no push notification is delivered to the signed-out device.
3. **Given** User A signs out of a device and User B signs into the same device, **When** an event fires for User A, **Then** no notification is delivered; **When** an event fires for User B, **Then** the notification is delivered to the device for User B.

---

### User Story 5 - Contextual Permission Request & Non-Blocking Fallback (Priority: P2)

The application prompts users for notification permission at a specific high-intent moment — for customers, immediately after their first order is successfully placed; for drivers, immediately after they toggle to "Available" for the first time in a session. No prompt is shown on cold app launch or while browsing as a guest. If a user declines or disables push permissions, the app continues to function fully across all features via existing in-app screens and real-time updates. Push notifications serve as an enhancement, never a blocker.

**Why this priority**: Prompting at high-intent moments (just ordered food / just started a shift) significantly improves opt-in rates by providing immediate, obvious value context. Non-blocking fallback guarantees core business operations are never impeded by OS-level permission choices.

**Independent Test**: Can be tested by launching the app as a guest and verifying no permission prompt is shown; placing an order as a customer (or toggling Available as a driver) to verify the prompt fires exactly once after that action; denying permission and confirming full ordering and fulfillment capabilities continue to work smoothly.

**Acceptance Scenarios**:

1. **Given** an unauthenticated guest is browsing restaurants or menus, **When** the app launches, **Then** no notification permission prompt is shown.
2. **Given** an authenticated customer successfully places their first order, **When** the order placement succeeds, **Then** the system immediately presents the OS notification permission prompt. **Given** an authenticated driver toggles to "Available" for the first time in a session, **When** the toggle is confirmed, **Then** the system immediately presents the OS notification permission prompt.
3. **Given** a user denies or revokes notification permission, **When** orders are placed or updated, **Then** all in-app navigation, order progress views, and driver claiming mechanisms continue to function without error.

---

### User Story 6 - Foreground Notification Suppression & Deep Linking (Priority: P3)

When the application is open and active in the foreground while an order lifecycle event occurs, the system produces no visible notification at all — no OS banner, no in-app toast, no snackbar. The existing real-time screen update is the sole signal to a foregrounded user. When the app is in the background or the device is locked, notifications display standard OS banners with sound and vibration that deep-link directly to the relevant screen upon tap.

**Why this priority**: UX consistency and implementation simplicity. The user is already looking at live, updating data; an additional alert would duplicate information and obscure controls. Eliminating the in-app toast path also removes a distinct UI component from scope.

**Independent Test**: Can be tested by keeping the app foregrounded on the order detail screen while triggering a status change — verify the screen updates silently with no OS banner and no in-app toast/snackbar appearing. Then background the app, trigger a change, and verify the OS notification banner appears and navigates to the correct screen on tap.

**Acceptance Scenarios**:

1. **Given** the customer app is open and in the foreground, **When** an order status update occurs, **Then** the active screen updates via real-time data; no OS notification banner and no in-app toast or snackbar is displayed.
2. **Given** the driver app is open and in the foreground, **When** a new order enters the pool, **Then** the pool updates via real-time data; no OS notification banner and no in-app toast or snackbar is displayed.
3. **Given** the app is in the background or the device is locked, **When** a notification arrives, **Then** the system presents a standard OS notification banner with sound and vibration.
4. **Given** a user taps an incoming or notification center banner, **When** the app opens, **Then** the app deep-links directly to the appropriate screen (order detail for customer, available pool for driver).

---

### Edge Cases

- **Driver toggles Offline just before order creation**: If a driver toggles Offline immediately before an order is placed, the server-side availability check MUST ensure no push notification is dispatched to that driver.
- **Order claimed before driver taps notification (stale tray notifications)**: If multiple drivers receive a push notification for a new order and Driver A claims it first, Driver B tapping the notification will open the available orders pool where the order is no longer listed, displaying the remaining available orders or an empty-pool message without errors. The app MUST NOT programmatically clear or dismiss OS notification tray items on foreground — stale notifications are left in the device tray and their staleness is handled entirely by the pool UI reflecting current server state.
- **Order cancelled while driver notification is in flight**: If a customer cancels an order before any driver claims it, tapping the notification opens the pool cleanly; the cancelled order does not appear.
- **Order released while customer is outside the app**: If the assigned driver releases the order (status regresses to `pending`), the customer MUST receive the `released` notification and eligible Available drivers MUST receive the pool notification; the releasing driver is treated like any other driver for pool targeting.
- **Network failure during token registration**: If the device cannot reach the server to register its push token upon sign-in (e.g. intermittent connectivity), the app MUST queue or retry registration upon network restoration without failing the sign-in flow.
- **Sign-out while device is offline**: If sign-out occurs while the device has no internet connection, local push token association MUST be cleared immediately, and the server-side token association MUST be invalidated on next server contact.
- **Invalid, rotated, or expired push tokens**: When a push delivery attempt fails because the delivery provider reports the token as invalid or unregistered (e.g. app uninstalled), the server MUST automatically deactivate or remove the stale token to avoid future failed dispatches.
- **User with zero registered devices**: When an order event occurs for a user with no registered device tokens (e.g. permissions denied or signed out on all devices), the server MUST process the order transition normally without error or delay.
- **Server-authoritative triggering guarantee**: Client applications MUST NOT trigger push notifications directly to other users. All notifications MUST originate from verified database state transitions on the server.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST register a client device push notification token on the server upon successful user authentication when permissions are granted, using an upsert-by-token-string strategy: if the exact token already exists in the registrations table, the system MUST update the existing record in place (refresh the active flag and last-updated timestamp) rather than creating a duplicate row.
- **FR-002**: The system MUST associate registered push notification tokens with the authenticated user's account ID.
- **FR-003**: The system MUST support multiple active registered push tokens for a single user account across different devices (e.g. phone and tablet).
- **FR-004**: The system MUST dispatch notifications to all active registered devices associated with the recipient user.
- **FR-005**: The system MUST deactivate or delete the current device's push token registration from the server during the user sign-out sequence.
- **FR-006**: The system MUST ensure that a device that has completed sign-out receives no subsequent notifications intended for the signed-out account.
- **FR-007**: The system MUST trigger a push notification to all drivers who have the driver role AND are currently marked "Available" AND are not holding an active delivery (status `accepted`, `preparing`, or `out_for_delivery`) when a new order enters the unclaimed pending pool — including released orders re-entering the pool. Delivery is one notification per new order with no throttling or coalescing, even when multiple orders arrive in rapid succession.
- **FR-008**: The system MUST NOT deliver new order pool push notifications to any driver whose status is "Offline" or who is already holding an active delivery.
- **FR-009**: The system MUST trigger a distinct, human-readable push notification to the customer who placed the order when the order transitions to each of: `accepted`, `preparing`, `out_for_delivery`, `delivered`, and `cancelled` (cancelled by customer, restaurant, or system), and when the assigned driver releases the order back to the pool (`released` — message MUST explain that a new driver is being found).
- **FR-010**: Push notification titles and bodies MUST be human-readable, specific to the milestone, and identify the order context (e.g. restaurant name or friendly order reference). Titles and bodies MUST be composed in the recipient device's OS locale (Arabic and English at minimum); the server resolves the locale per device token at dispatch time. Driver pool (`new_order_pool`) notifications MUST disclose only the pickup zone/area and order value — never customer name, phone, delivery address, or order contents prior to claim.
- **FR-011**: Tapping a customer order push notification MUST open the application and navigate directly to that specific order's detail/tracking screen.
- **FR-012**: Tapping a driver pool push notification MUST open the driver application and navigate directly to the available orders pool screen.
- **FR-013**: The system MUST request notification permissions at the first high-intent moment after authentication — for customers, immediately after their first order is successfully placed; for drivers, immediately after they toggle to "Available" for the first time in a session. The permission prompt MUST NOT be shown on cold app launch or during unauthenticated guest browsing.
- **FR-014**: All core application capabilities (browsing, ordering, tracking, driver fulfillment) MUST continue to operate fully via standard in-app screens and real-time updates when notification permission is denied.
- **FR-015**: Notification delivery MUST originate exclusively from server-side database state transitions, never from client-side optimistic declaration.
- **FR-016**: The system MUST suppress all OS notification banners when the application is actively in the foreground. No in-app toast, snackbar, or banner is displayed; the existing real-time screen update is the sole foreground signal.
- **FR-017**: The server MUST automatically deactivate or prune push tokens that are reported as invalid, expired, or unregistered by the push delivery provider. The server MUST NOT expire tokens based on age or inactivity alone — tokens are removed only on explicit provider invalid/unregistered feedback or on user sign-out.
- **FR-018**: The server MUST NOT implement custom retry or persistence logic for transiently undelivered notifications. Delivery of notifications to offline devices is delegated entirely to OS-level push provider queuing (e.g. APNs / FCM built-in store-and-forward within their standard TTL windows). If a notification is not delivered within the provider's TTL, it is silently dropped; users rely on in-app real-time views for current order state.

### Key Entities

- **Device Push Registration**: Represents an active association between a user account, a physical client device, and its push notification token. Key attributes: user identifier, push token string, device platform/metadata, active status flag, created timestamp, and last updated timestamp. **Uniqueness rule**: the push token string is the unique key — if the same token is re-registered (e.g. on app relaunch), the existing row is updated in place rather than duplicated.
- **Notification Event**: A server-side record capturing an order lifecycle change that warrants notification delivery. Key attributes: event type (`new_order_pool`, `order_accepted`, `order_preparing`, `order_out_for_delivery`, `order_delivered`, `order_cancelled`, `order_released`), target recipient identifier(s), target recipient role (`customer` or `driver`), source order identifier, notification title, notification body, deep link target payload, and delivery dispatch status.
- **Notification Target**: The recipient entity resolved from the event. For customer milestones, resolves to the order's owning customer user ID; for driver pool events, resolves to all users with `role = driver` AND availability status equal to `Available` AND no active delivery (`accepted`, `preparing`, `out_for_delivery`) — mirroring the `get_available_orders()` pool semantics.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Push notifications for order lifecycle transitions are dispatched by the server within 3 seconds of the verified database state change.
- **SC-002**: 100% of eligible Available drivers (Available with no active delivery) receive a push notification when a new order enters the pool, while 0% of Offline drivers and 0% of drivers holding an active delivery receive the notification.
- **SC-003**: 100% of order lifecycle transitions (`accepted`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`, `released`) result in distinct, human-readable notifications dispatched to all active registered devices of the customer.
- **SC-004**: Tapping a push notification deep-links to the intended screen (order detail for customer, available pool for driver) in under 2 seconds from cold or warm app launch.
- **SC-005**: 0% of notifications intended for a previous account are delivered to a device after the user completes the sign-out sequence.
- **SC-006**: Users with multiple active devices receive push notifications across all registered devices within 3 seconds of server dispatch.
- **SC-007**: 100% of core app features (browsing, ordering, tracking, claiming orders) remain fully operational when notification permissions are denied.
- **SC-008**: 0% of push notifications originate from optimistic client-side declarations; all notification dispatches are verified to originate from server-side database state transitions.

## Assumptions

- The existing authentication system (feature 002-auth-and-onboarding) provides authenticated user identities, role claims (`customer`, `driver`), and session lifecycle hooks (sign-in, sign-out).
- The existing driver fulfillment system (feature 003-driver-fulfillment) manages driver availability states (`Available` vs `Offline`) and order lifecycle states (`pending`, `accepted`, `preparing`, `out_for_delivery`, `delivered`).
- The existing domain layer defines a `NotificationService` interface (Principle VIII), which this feature implements at the infrastructure layer without altering domain signatures.
- Real-time in-app updates and push notifications remain separate concerns (Principle VIII): real-time updates drive live in-app screen changes, while push notifications deliver alerts when outside the app or when screen focus is elsewhere.
- In-app foreground behavior is completely silent: the OS banner is suppressed and no in-app toast, snackbar, or banner is shown. The existing real-time screen update is the sole signal when the app is foregrounded (resolved: FR-016).
- Contextual permission prompting fires at these precise triggers: for customers, immediately after their first order is successfully placed; for drivers, immediately after they toggle to "Available" for the first time in a session. The prompt fires at most once per trigger event (not on every subsequent order or toggle).
- Rich interactive notification actions (accepting/declining directly from OS notification banner), notification preferences/settings screens, in-app notification center/inbox, and SMS/email channels are explicitly out of scope.

## Clarifications

### Session 2026-09-22

- Q: When an order update fires while the app is actively open and in the foreground, should the system show a lightweight in-app toast/banner in addition to the existing real-time UI update, or should it remain completely silent and rely solely on the real-time screen refresh? → A: Completely silent — suppress OS banner, no in-app toast; the real-time UI update on the active screen is sufficient.
- Q: When the app launches or a user re-authenticates on a device that already has a registered token, how should the server handle the token record — overwrite (upsert) the existing record for that user+device combination, or create a new record and keep the old one? → A: Upsert by token string — if the exact token already exists, update the record in place (refresh active flag and last-updated timestamp); otherwise insert a new row.
- Q: When the app is in the background or killed and the device has no internet connection, and an order event fires on the server — should the push notification be delivered once connectivity is restored (OS-level queuing), or is a missed notification simply dropped with no retry? → A: Rely on OS-level push provider queuing only (APNs / FCM built-in store-and-forward within their standard TTL); no server-side retry or persistence logic is implemented.
- Q: At what precise moment should the app first request notification permission from an authenticated user — immediately after the first successful sign-in completes, or deferred to the first high-intent action? → A: Deferred to first high-intent action — for customers, immediately after their first order is placed; for drivers, immediately after they toggle Available for the first time in a session.
- Q: When a driver re-opens the app after being Offline and there are stale pool notifications in the OS tray, should the app programmatically clear them from the tray, or leave them and rely on the pool UI to reflect current state? → A: Leave notifications in the OS tray; stale state is handled gracefully by the pool UI reflecting current server state — no programmatic tray clearing on foreground.
- Q: When an order is cancelled after being placed (by customer, restaurant, or system), should the customer receive a push notification about the cancellation? → A: Yes — dispatch a distinct human-readable `order_cancelled` notification to the customer's devices like any other lifecycle milestone.
- Q: In which language(s) should push notification titles and bodies be composed? → A: Device locale — server composes per-device-token in the recipient device's OS locale (Arabic and English at minimum).
- Q: When several new orders enter the unclaimed pool in rapid succession, should bursts be coalesced or throttled? → A: One notification per order — no throttling or coalescing, even for rapid bursts.
- Q: What order detail should a driver pool push notification reveal before the order is claimed? → A: Pickup zone/area and order value only — never customer name, phone, delivery address, or order contents until claimed.
- Q: How should the server handle push tokens that remain registered but inactive for a long time ("token freshness checks")? → A: Provider signals only — prune on explicit provider invalid/unregistered feedback or sign-out; never expire tokens on age or inactivity alone.
