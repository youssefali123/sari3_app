# Feature Specification: Driver Fulfillment

**Feature Branch**: `003-driver-fulfillment`

**Created**: 2026-09-20

**Status**: Draft

**Input**: User description: "Enable authenticated drivers to fulfill customer orders end-to-end."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Driver Availability Toggle (Priority: P1)

A driver opens the app and sees their current availability status. They can switch between "Available" and "Offline" at any time. When they go Offline, the orders list disappears immediately and no new orders can be seen or claimed. The server enforces this restriction — a driver who manually bypasses the UI toggle still cannot access or claim orders.

**Why this priority**: Availability control is the entry gate to all driver functionality. Without it, no order can be seen or accepted. It is also a security boundary that must be enforced server-side.

**Independent Test**: Can be tested fully by toggling the status and verifying that order access is granted only when Available — both through normal app flow and by attempting a direct API call while Offline.

**Acceptance Scenarios**:

1. **Given** a driver is Available, **When** they switch to Offline, **Then** the available orders list is no longer visible and any attempt to fetch or claim an order is rejected by the server.
2. **Given** a driver is Offline, **When** they switch to Available, **Then** the available orders list becomes visible with live data.
3. **Given** a driver sets their status to Offline via the UI, **When** a tampered client sends a request as if the driver were Available, **Then** the server rejects the request and the driver gains no order access.

---

### User Story 2 - Browse and Claim an Available Order (Priority: P1)

A driver who is Available sees a real-time list of unclaimed orders. Each order shows enough information to decide whether to accept it (store name, general area/distance, item count) but does NOT reveal the customer's exact address or phone number yet. The driver taps "Accept" on an order. If no one else has claimed it in the meantime, it becomes their active order and full delivery details are revealed. If another driver claimed it first, the driver sees a clear "no longer available" message and the order is removed from their list.

**Why this priority**: This is the core driver action — accepting an order is the primary value delivered by the feature and must be race-condition safe.

**Independent Test**: Can be tested by having two driver accounts attempt to accept the same order simultaneously and verifying only one succeeds and the other receives a clear failure message.

**Acceptance Scenarios**:

1. **Given** a driver is Available with no active order, **When** they open the orders list, **Then** they see all unclaimed orders with store name, store neighbourhood label (derived from `restaurants.address` at read time — not a stored orders column), and item count — but no customer address or phone number.
2. **Given** a driver is Available and taps Accept on an order, **When** no other driver has claimed it, **Then** the order becomes their active order and full delivery details (address, customer contact) are revealed.
3. **Given** two drivers attempt to accept the same order simultaneously, **When** both requests arrive at the server, **Then** exactly one driver receives the order and the other receives a clear "no longer available" message — the order is never assigned to both.
4. **Given** a driver has an active order, **When** they view the app, **Then** the available orders list is hidden entirely (not just disabled).

---

### User Story 3 - Decline an Order (Priority: P2)

A driver sees an available order they do not want to take. They tap "Decline." The order disappears from their own list but remains available for other drivers to claim. The decline is recorded for the driver's history.

**Why this priority**: Declining is important for driver autonomy and is needed for history tracking, but the app still functions without it (drivers can simply ignore orders). It is lower priority than accepting.

**Independent Test**: Can be tested by declining an order as Driver A and confirming it is still visible and claimable as Driver B, and appears in Driver A's history.

**Acceptance Scenarios**:

1. **Given** a driver sees an available order, **When** they decline it, **Then** the order disappears from their own list but remains visible to other drivers.
2. **Given** a driver declines an order, **When** another driver views the pool, **Then** the declined order is still present and claimable.
3. **Given** a driver has declined orders in the past, **When** they view their delivery history, **Then** declined orders appear in the history with the appropriate status.

---

### User Story 4 - Advance Order Through Delivery Lifecycle (Priority: P1)

A driver with an active order advances its status step by step: accepted → preparing → out_for_delivery → delivered. The driver cannot skip a step or move backward. As the driver updates each status, the customer's existing order-status view is updated automatically.

**Why this priority**: Lifecycle progression is the fulfillment core — without it, there is no completion. It must be enforced in strict order.

**Independent Test**: Can be tested by attempting to advance an order out of sequence (e.g., directly to "delivered" from "accepted") and verifying the server rejects the invalid transition.

**Acceptance Scenarios**:

1. **Given** a driver has an active order in state "accepted," **When** they advance it, **Then** the new state becomes "preparing" — not "out_for_delivery" or "delivered."
2. **Given** a driver attempts to move an order backward (e.g., from "preparing" to "accepted"), **Then** the server rejects the request and the order remains in its current state.
3. **Given** a driver advances an order to "delivered," **When** the update succeeds, **Then** the order moves to the driver's history and they can accept a new order.
4. **Given** a driver updates any order status, **When** the update succeeds, **Then** the customer's order-status view reflects the new status without any additional action from the customer.

---

### User Story 5 - View Delivery History (Priority: P2)

A driver can navigate to a history screen showing all past orders they completed, declined, or that were cancelled by the customer while still pending.

**Why this priority**: History provides transparency and accountability and is referenced by other requirements (e.g., decline history). It does not block core functionality.

**Independent Test**: Can be tested by completing a full order cycle (accept → delivered) and verifying it appears in the driver's history with correct status.

**Acceptance Scenarios**:

1. **Given** a driver has completed one or more orders, **When** they view their history, **Then** each entry shows the store name, order date/time, and final status (completed / declined / released / cancelled) — listed newest-first.
2. **Given** a driver has declined orders, **When** they view their history, **Then** declined orders appear with a "declined" status.
3. **Given** a customer cancelled an order while it was still pending, **When** the driver views their history (if they had declined it, or accepted and later released it — US5 ambiguity A1 resolution), **Then** the cancelled order appears with the correct status.
4. **Given** a driver has no past orders, **When** they view the history screen, **Then** they see an appropriate empty state rather than a blank or frozen screen.
5. **Given** a driver released an order (FR-014), **When** they view their history, **Then** the entry shows a "released" status and the mandatory reason the driver provided at the time of release.

---

### User Story 6 - Driver Profile & Sign-Out (Priority: P3)

A driver has a profile screen showing their own info, current availability status, and a sign-out action. This mirrors the equivalent customer profile screen already in the app.

**Why this priority**: Profile and sign-out are supporting functionality. The driver experience is functional without a profile screen; it is a parity/polish item.

**Independent Test**: Can be tested by viewing the profile screen and signing out, then verifying the driver is redirected to the authentication flow.

**Acceptance Scenarios**:

1. **Given** a driver is signed in, **When** they navigate to their profile, **Then** they see their name, current availability status, and a sign-out button.
2. **Given** a driver taps sign-out, **When** the action completes, **Then** they are redirected away from all driver screens and cannot re-enter without signing in again.

---

### User Story 7 - Role Enforcement & Access Control (Priority: P1)

Only users with the driver role can access driver screens or perform driver actions. A customer who navigates to a driver screen is redirected. A driver who attempts to place a customer order is rejected by the server.

**Why this priority**: Access control is a foundational security requirement. Without it, the app's role model is broken.

**Independent Test**: Can be tested by using a customer-role account to attempt direct navigation to a driver route and by attempting a driver API action — both must fail server-side.

**Acceptance Scenarios**:

1. **Given** a user with the customer role attempts to navigate to a driver screen, **Then** they are redirected away without accessing any driver content.
2. **Given** a user with the driver role attempts to place a customer order, **Then** the server rejects the request regardless of what the client sends.
3. **Given** a driver's profile record is missing or malformed on login, **Then** the app shows an explicit, recoverable error state rather than silently misrouting the driver into driver screens (consistent with the equivalent edge case in auth-and-onboarding).

---

### User Story 8 - Order Release / Stuck Order Resolution (Priority: P2)

If a driver accepts an order but cannot complete it (e.g., vehicle breakdown, restaurant closed), the driver can self-report their inability to continue. They must provide a mandatory reason, after which the order is immediately returned to the shared pool for other drivers to claim. The release and reason are logged in the driver's history.

**Why this priority**: A stuck order blocks the customer indefinitely. The self-report mechanism is operationally critical and gives drivers a clear, low-friction path to unblock a situation while maintaining an audit trail.

**Independent Test**: Can be tested by accepting an order as a driver, triggering the self-report flow with a reason, and verifying that the order reappears in the shared pool for another driver and the reason appears in the releasing driver's history.

**Acceptance Scenarios**:

1. **Given** a driver has an active order they cannot complete, **When** they trigger the self-report release and provide a mandatory reason, **Then** the order is immediately returned to the shared pool and the driver no longer has an active order.
2. **Given** a driver attempts to trigger the release without providing a reason, **Then** the release is not permitted and the order remains active with an appropriate validation message.
3. **Given** the order has been released back to the pool, **When** another Available driver views the orders list, **Then** the released order appears as a plain unclaimed order — identical to any other unclaimed order with no indication that it was previously picked up.
4. **Given** a driver has released an order, **When** they view their delivery history, **Then** the released order appears with a "released" status and the reason they provided.
5. **Given** a driver has already released one or more orders in a shift or day, **When** they release another active order with a mandatory reason, **Then** the release is processed without reaching a cap — no daily or per-shift limit is enforced.

---

### Edge Cases

- A driver with no available orders sees an appropriate empty state message — not a blank or frozen screen.
- A driver whose availability is Offline receives a server-side rejection if they attempt to fetch or claim orders, regardless of client state.
- A driver's profile record that is missing or malformed on login triggers an explicit, recoverable error state — not a silent misroute into driver screens.
- An order that disappears from the pool (claimed by another driver) while the current driver is viewing it is removed cleanly from their list on the next real-time update.
- A driver with an active order cannot accept any additional order; the attempt is rejected server-side.
- The customer's order-status view remains consistent when driver status updates occur concurrently with customer app refreshes.
- If the device loses network connectivity while a delivery is in progress, the app MUST display an explicit offline notice (banner or equivalent) and block all driver actions (status advances, release, availability toggle) with a clear "No connection — please retry" message. No silent failure or optimistic update is permitted. Actions resume normally once connectivity is restored.
- Repeated order releases by a single driver are permitted without automated rate limiting or daily/shift caps; each release mandates a reason and is recorded in delivery history (FR-011) for manual operational review.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a driver to toggle their availability between "Available" and "Offline."
- **FR-002**: The system MUST enforce the driver's availability status server-side — an Offline driver MUST NOT be able to view or claim orders regardless of client state.
- **FR-003**: The system MUST display a real-time list of unclaimed orders to Available drivers, updated as orders appear or are claimed.
- **FR-004**: Each order in the available-orders list MUST show store name, and item count — but MUST NOT reveal the customer's exact delivery address or phone number prior to acceptance. The neighbourhood label shown next to the store name is derived at read time from the store's public `restaurants.address` column (e.g., "Maadi", "New Cairo"); it is NOT a column stored on `orders`, and no customer-address data is used to produce it. No driver location or GPS data is used to compute this field.
- **FR-005**: The system MUST allow a driver to accept an available order using an atomic, concurrency-safe operation — two drivers can never successfully accept the same order.
- **FR-006**: Upon successful acceptance, the system MUST reveal full delivery details (address, customer contact) to the accepting driver.
- **FR-007**: A driver MUST only have one active order at a time; while an active order exists, the available-orders list MUST be hidden entirely and no further order acceptance is permitted until the active order reaches "delivered" or is released.
- **FR-008**: The system MUST allow a driver to decline a specific available order; declining removes it from that driver's view only and does not affect other drivers' access to it.
- **FR-009**: The system MUST allow a driver to advance their active order through the lifecycle in strict sequence: accepted → preparing → out_for_delivery → delivered. Skipping states or moving backward MUST be rejected server-side.
- **FR-010**: The system MUST automatically propagate driver-initiated order status updates to the customer's existing order-status view.
- **FR-011**: The system MUST provide a driver history screen listing past orders that were completed, declined, released, or cancelled by the customer while pending. Each entry MUST display: store name, order date/time, and final status (completed / declined / released / cancelled). For "released" entries, the mandatory reason provided by the driver MUST also be shown. Entries MUST be listed newest-first.
- **FR-012**: The system MUST provide a driver profile screen showing the driver's own info, current availability status, and a sign-out action.
- **FR-013**: The system MUST restrict all driver screens and actions to users with the driver role; non-driver users attempting to access driver routes MUST be redirected, and server-side requests MUST be rejected.
- **FR-014**: The system MUST provide a driver-initiated order release mechanism: a driver with an active order they cannot complete MUST be able to self-report their inability to continue by providing a mandatory reason. Upon submission, the order MUST revert to its pre-acceptance unclaimed state and re-enter the shared pool exactly like any other unclaimed order — no distinct "released" state is added to the order's lifecycle. The release event (including the reason) MUST be logged in the releasing driver's delivery history only. The system imposes no hard limit or cap on the number of releases a driver can submit; the mandatory reason and delivery history logging (FR-011) serve as the deterrent, with potential abuse reviewed manually.
- **FR-015**: The system MUST display an appropriate empty state when a driver has no available orders, no history items, or other empty-list scenarios.
- **FR-016**: When the device loses network connectivity, the app MUST display an explicit offline notice (banner or equivalent) and block all driver actions (status advances, release, availability toggle) with a "No connection — please retry" message. No action must be queued, optimistically applied, or silently dropped. All blocked actions MUST become available again immediately upon connectivity restoration.

### Key Entities

- **Driver**: A user with the driver role. Has an availability status (Available / Offline), one optional active order at any given time, and a history of past interactions.
- **Available Order**: An order in the shared pool visible to all Available drivers. Carries store name, store neighbourhood label (derived at read time from `restaurants.address`, not stored on the order), and item count — not customer personal details.
- **Active Order**: An order accepted by a specific driver. Carries full delivery details and a current lifecycle state.
- **Order Status**: The current position in the fulfillment lifecycle (accepted → preparing → out_for_delivery → delivered). State transitions are strictly sequential and server-enforced. "Released" is NOT a lifecycle state on the order — a released order reverts to its unclaimed pre-acceptance state. "Released" exists only as a final status label within a driver's delivery history record.
- **Order Decline**: A record of a driver explicitly declining an available order. Scoped to that driver only; does not affect the order's availability to others.
- **Delivery History Entry**: A record in the driver's history representing a completed, declined, released, or cancelled (by customer) order. Fields: store name, order date/time, final status (completed / declined / released / cancelled), and — for released entries only — the mandatory release reason provided by the driver.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Drivers can toggle availability and see the effect on their order list within 2 seconds of toggling.
- **SC-002**: A double-accept scenario (two drivers accepting the same order simultaneously) always results in exactly one success and one visible "no longer available" failure — a 0% silent double-accept rate.
- **SC-003**: Real-time order list updates reach all Available drivers within 3 seconds of an order being placed or claimed.
- **SC-004**: A driver can progress an order from accepted through to delivered in under 5 minutes of active use without encountering errors caused by the system.
- **SC-005**: 100% of driver actions requiring authorization (view orders, accept, advance status) are rejected server-side when performed by non-driver users or Offline drivers — no bypass via client manipulation succeeds.
- **SC-006**: Drivers can view their complete delivery history and locate any past order within 5 seconds of opening the history screen.
- **SC-007**: The empty-state screen for no available orders is shown in 100% of cases where no orders exist — no blank or frozen screen is ever displayed.
- **SC-008**: 95% of drivers successfully complete their first order fulfillment end-to-end (accept → delivered) without requiring support intervention.

## Assumptions

- The existing authentication system (feature 002-auth-and-onboarding) correctly assigns and enforces the `driver` role. This feature depends on the `useAuth` / `useRequireAuth` hooks and the driver role being present in session data.
- The customer-facing order-status visibility is already built (feature 001) and will update automatically when order status changes — no new customer UI is required by this feature.
- A store neighbourhood label is sufficient for drivers to decide whether to accept an order. It is derived at read time from the store's public `restaurants.address` (review remediation I3: no `orders.delivery_zone` column exists or is needed). No driver GPS location or distance calculation is performed at listing time; exact GPS routing is out of scope.
- GPS/live location tracking, delivery fee changes, driver ratings, multiple simultaneous active orders per driver, admin driver management UI, and automatic reassignment of released orders to specific drivers are explicitly out of scope for this feature.
- A driver can only have one active order at any time; this constraint is enforced both in the UI (list hidden) and server-side.
- The stuck-order release mechanism (FR-014) is resolved as driver self-report with a mandatory reason field. The order is immediately returned to the shared pool upon submission. No hard limit or rate cap is placed on driver releases; manual review of delivery history logs is assumed sufficient to address any potential abuse. No admin UI or timed auto-release is required for this feature.
- Realtime order list updates are delivered via the existing Supabase Realtime infrastructure already in use by the project.
- The driver profile screen mirrors the customer profile screen in structure and is considered parity work, not a new design pattern.
- Order decline is a driver-scoped action only; the declined order's visibility to other drivers is not affected by any one driver's declines.

## Clarifications

### Session 2026-09-20

- Q: What specific fields should appear for each entry on the driver's delivery history screen, and in what order should entries be listed? → A: Store name, order date/time, final status (completed / declined / released / cancelled), and — for released entries — the mandatory release reason; listed newest-first.
- Q: When a driver self-reports they cannot complete an order and the order is returned to the shared pool, what order lifecycle state does it re-enter? → A: The order reverts to its pre-acceptance unclaimed state — no distinct "released" state added to the order lifecycle; "released" exists only as a driver history label.
- Q: How is "general area/distance" represented on the pre-acceptance order card — zone label or computed distance? → A: A store neighbourhood label derived at read time from the store's public `restaurants.address` (e.g., "Maadi", "New Cairo") — no driver GPS or distance computation required, and no zone column stored on the order (amended in plan review; see data-model §2.1).
- Q: What should the driver app show when the device loses network connectivity mid-delivery — explicit offline notice with retry, optimistic queue, or silent last-known state? → A: Explicit offline notice (banner/modal); all driver actions blocked with "No connection — please retry" until connectivity is restored. No silent failure or optimistic queuing.
- Q: Is there any limit on how many times a driver can self-report an order release (FR-014) within a given period to prevent abuse? → A: No hard limit for now; the mandatory reason and history log (FR-011) serve as the only deterrent — abuse is reviewed manually.
