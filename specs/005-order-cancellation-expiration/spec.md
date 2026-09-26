# Feature Specification: Order Cancellation & Expiration

**Feature Branch**: `005-order-cancellation-expiration`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "create a specification for i want to create and all details in this file: @[mds/update-sari3.md]"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer Self-Service Order Cancellation (Priority: P1)

A customer who has placed an order decides they need to cancel it. They open the order tracking/details screen in the mobile app and see a "Cancel Order" action. The customer is permitted to cancel their order at any point before delivery — specifically while the order is `pending` (unclaimed), `accepted` (claimed by driver), `preparing` (store preparing items), or `out_for_delivery` (driver en route). When the customer confirms cancellation, the server verifies order ownership, atomically updates the order status to `cancelled`, halts any active fulfillment, and confirms the cancellation immediately to the customer. If the order has already reached `delivered`, `cancelled`, or `expired`, the cancellation request is strictly rejected and the user is informed that the order can no longer be cancelled.

**Why this priority**: Customer self-service cancellation is essential for customer trust, order flexibility, and stopping unnecessary store preparation and driver travel. Allowing cancellation across active states prior to delivery is an explicit business decision.

**Independent Test**: Can be tested by placing orders, advancing them to each lifecycle phase (`pending`, `accepted`, `preparing`, `out_for_delivery`, `delivered`), issuing a cancellation request from the customer account, and verifying that cancellation succeeds atomically for all pre-delivery phases and fails with a clear message once `delivered`.

**Acceptance Scenarios**:

1. **Given** a customer has placed an order currently in `pending` status, **When** they tap "Cancel Order" and confirm, **Then** the order status transitions immediately to `cancelled`, the order remains stored in the system, and the customer UI updates to reflect the cancellation.
2. **Given** an order is in `accepted` status with an assigned driver, **When** the customer confirms cancellation, **Then** the order status transitions immediately to `cancelled` and the customer is shown confirmation without any redundant self-echo notification.
3. **Given** an order is in `preparing` status, **When** the customer confirms cancellation, **Then** the order status transitions immediately to `cancelled`.
4. **Given** an order is in `out_for_delivery` status, **When** the customer confirms cancellation, **Then** the order status transitions immediately to `cancelled` (deliberate product decision).
5. **Given** an order has already transitioned to `delivered`, **When** the customer attempts to cancel, **Then** the cancellation request is rejected and the order remains in `delivered` status.
6. **Given** an order is already `cancelled` or `expired`, **When** a cancellation request is submitted, **Then** the request is rejected with a clear state error.
7. **Given** Customer A attempts to submit a cancellation request for an order owned by Customer B, **When** the request arrives at the server, **Then** the request is strictly rejected due to ownership mismatch.

---

### User Story 2 - Real-Time Pool Removal on Cancellation & Expiration (Priority: P1)

When a customer cancels a `pending` order, or when a pending order expires after remaining unclaimed for 30 minutes, the order must disappear immediately from the Driver Available Orders pool in real time. Drivers currently looking at the available orders screen must see the order removed instantly without having to pull-to-refresh or wait for a polling timer. The underlying order record is preserved in the database with status `cancelled` or `expired` — it is never deleted.

**Why this priority**: Prevents "phantom claims" where drivers see and attempt to claim orders that customers have already aborted or that have timed out.

**Independent Test**: Open the Driver Available Orders screen on Device A. On Device B, cancel a pending order (or let it expire). Verify that within 1 second, the order is removed from Device A's view with zero manual interaction.

**Acceptance Scenarios**:

1. **Given** an unclaimed order is visible in Driver Available Orders, **When** the customer cancels the order, **Then** the order disappears from the available orders list across all viewing drivers in real time.
2. **Given** an unclaimed order has been pending for over 30 minutes, **When** the system marks the order expired, **Then** the order disappears from the available orders list across all viewing drivers in real time.
3. **Given** an order is removed from the pool due to cancellation or expiration, **When** the database is inspected, **Then** the order row still exists with its full immutable snapshots and terminal status.

---

### User Story 3 - Active Driver Cancellation Propagation & Push Alert (Priority: P1)

If a customer cancels an order after a driver has already accepted it (order in `accepted`, `preparing`, or `out_for_delivery`), the assigned driver must be notified immediately through both in-app real-time feedback and an out-of-app push notification:
1. **In-App Real-Time**: If the driver is actively viewing the order on the Active Order screen, the interface updates immediately to display a prominent notice: "Customer cancelled this order".
2. **Sequential Guard**: The driver is strictly prevented from advancing the cancelled order further (cannot advance to `preparing`, `out_for_delivery`, or `delivered`).
3. **Capacity Release**: The order immediately stops counting toward the driver's one-active-delivery capacity limit, allowing the driver to view and accept other orders without friction.
4. **Push Notification (Actor-Aware)**: The assigned driver receives a high-priority push notification informing them that the customer cancelled the order, formatted as "The customer cancelled your order from {restaurant_name}" (Arabic: "قام العميل بإلغاء طلبك من {restaurant_name}"). The notification never uses human order numbers (which do not exist in Sari3) and never exposes customer PII.
5. **No Redundant Self-Echo**: The customer who initiated the cancellation does NOT receive a push notification telling them that their order was cancelled, avoiding confusing self-echo alerts.

**Why this priority**: Avoids wasted driver travel, avoids food waste when possible, prevents driver confusion, and ensures driver availability is freed up immediately. Actor-awareness ensures clean notification UX.

**Independent Test**: Assign a driver to an order. As the customer, cancel the order. Verify that: (a) the driver's active screen displays "Customer cancelled this order" immediately, (b) advance actions are disabled, (c) the driver can immediately accept another order from the pool, (d) the driver receives a push notification on their device, and (e) the customer receives no cancellation push notification.

**Acceptance Scenarios**:

1. **Given** a driver has accepted an order and is viewing the Active Order screen, **When** the customer cancels the order, **Then** the driver sees "Customer cancelled this order" in real time without refreshing.
2. **Given** a driver's active order has been cancelled by the customer, **When** the driver attempts to advance the order status, **Then** the server rejects the transition and prevents state progression.
3. **Given** a driver's active order has been cancelled, **When** the driver views the Available Orders pool or checks their availability status, **Then** their active delivery slot is clear and they can immediately claim a new available order.
4. **Given** an assigned driver has the app in the background when the customer cancels, **When** the cancellation occurs, **Then** the driver receives an `order_cancelled_by_customer` push notification detailing the cancellation.
5. **Given** a customer cancels their own order, **When** the cancellation completes, **Then** no customer-facing cancellation push notification is dispatched to the customer's registered devices.
6. **Given** a customer cancels a pending order with no assigned driver, **When** cancellation completes, **Then** no driver cancellation push notification is emitted.

---

### User Story 4 - Automatic Expiration of Stale Pending Orders (Priority: P1)

An order that remains in `pending` status without being claimed by any driver for more than 30 minutes must not remain available indefinitely. The system automatically identifies stale pending orders whose age (measured strictly by server creation timestamp against current server time) exceeds 30 minutes and transitions them from `pending` to `expired`.
- **Pool Removal**: The expired order ceases to be visible or claimable by drivers.
- **Customer Notification**: The customer receives a push notification informing them that their order has expired because no driver was available.
- **Order History Status**: The customer sees the order in their history marked with a distinct "Expired" status badge.
- **Race Protection**: A driver attempting to claim an order that has reached or passed the 30-minute boundary is strictly rejected by the server, even if the background expiration process has not yet executed.

**Why this priority**: Prevents customers from waiting indefinitely for unfulfillable orders and prevents drivers from claiming cold, stale orders that restaurants cannot reasonably fulfill.

**Independent Test**: Create a pending order with a creation timestamp older than 30 minutes. Trigger the automated expiration process. Verify that: (a) status transitions to `expired`, (b) the order drops from driver pool, (c) the customer receives an `order_expired` push notification, and (d) any concurrent claim attempt fails atomically.

**Acceptance Scenarios**:

1. **Given** an unclaimed order has been pending for over 30 minutes, **When** the server expiration process executes, **Then** the order status atomically transitions from `pending` to `expired`.
2. **Given** an order has expired, **When** the customer views their order history, **Then** the order displays the status "Expired".
3. **Given** an order has expired, **When** the transition occurs, **Then** the customer receives an `order_expired` push notification alerting them that the order timed out.
4. **Given** an order is 30 minutes and 1 second old and has not yet been processed by the background expiration job, **When** a driver attempts to claim it, **Then** the server evaluates the order age live and rejects the claim atomically.
5. **Given** a claim attempt and the expiration process execute simultaneously for an order at the 30-minute boundary, **Then** the server ensures exactly one outcome wins atomically, and an expired order is never assigned to a driver.

---

### User Story 5 - Reorder from Expired or Past Orders ("Order Again") (Priority: P2)

When a customer views an expired order (or any past terminal order) in their order history, they see an "Order Again" button. Tapping "Order Again" allows the customer to quickly place a fresh order based on their previous purchase:
- **Cart Rebuilding**: The application retrieves the historical snapshot items (products, quantities, add-on selections) and places them into the customer's cart.
- **Live Catalog Revalidation**: The system revalidates each item against the current store menu — checking current product availability, prices, active add-ons, and promotions. Stale or discontinued items are flagged or excluded with a clear notification.
- **Store Conflict Handling**: If the customer already has items from a different store in their cart, the system triggers the standard single-store conflict confirmation prompt ("Replace cart items?"). It never silently overwrites the cart.
- **Checkout Confirmation**: The system does NOT automatically create an order. The customer is navigated to checkout where they review current totals, confirm their delivery address, select a payment method, and explicitly tap "Place Order".
- **History Immutability**: The historical expired order remains completely unchanged and immutable.

**Why this priority**: Enhances customer convenience and recovery when orders expire due to driver shortages, while strictly protecting business rules around current pricing, menu changes, and customer consent.

**Independent Test**: Tap "Order Again" on an expired order with active cart items from another store. Verify the conflict prompt appears. Confirm replacement, verify items and current prices populate the cart, and verify an explicit checkout action is required to place the new order.

**Acceptance Scenarios**:

1. **Given** a customer views an expired order, **When** they tap "Order Again", **Then** the items from the order are staged into the cart with current catalog validation.
2. **Given** the customer's cart already contains items from Store A, **When** the customer taps "Order Again" on an order from Store B, **Then** the system presents the single-store conflict prompt asking whether to replace the existing cart.
3. **Given** a product or add-on from the old order is currently out of stock or deleted, **When** "Order Again" is initiated, **Then** the customer is clearly notified of unavailable items and only available items are added.
4. **Given** "Order Again" populates the cart, **When** the customer reviews the cart, **Then** current prices and current store fees are reflected, and the customer must proceed through standard checkout to place the order.
5. **Given** "Order Again" completes successfully, **When** the past order record is inspected, **Then** the historical order remains completely unmodified.

---

### User Story 6 - Customer Order History Hiding (Priority: P2)

A customer wishes to clean up or hide certain past orders from their visible order history. When viewing an order in their history list, the customer can choose a "Remove from History" / "Hide Order" action:
- **Soft-Hide Only**: The order is marked as hidden from the customer's view. It is NEVER physically deleted from the database.
- **Audit & History Integrity**: Financial totals, item snapshots, driver associations, timestamps, and reporting records remain fully intact.
- **Ownership Scoping**: A customer can only hide their own orders. Any attempt to hide another user's order is strictly rejected.
- **Persistent Visibility Exclusion**: Subsequent fetches of the customer's order history completely exclude hidden orders.
- **Deep-Link / Order Again Compatibility**: If a customer navigates to a hidden order via a deep link or prior receipt, they can still view details and trigger "Order Again".

**Why this priority**: Gives customers control over their personal order history and privacy without compromising regulatory, financial, and operational audit records.

**Independent Test**: As Customer A, hide Order 1. Verify Order 1 vanishes from Customer A's order history list. Verify Order 1 still exists in the database with identical snapshot and financial data. Verify Customer B cannot hide Order 1.

**Acceptance Scenarios**:

1. **Given** a customer views an order in their order history, **When** they choose "Remove from History" and confirm, **Then** the order disappears from their order history list.
2. **Given** an order is hidden by a customer, **When** the database records are inspected, **Then** the order and its snapshots exist intact, with a hidden timestamp recorded.
3. **Given** Customer A attempts to hide an order belonging to Customer B, **When** the request arrives at the server, **Then** the request is rejected with an authorization error.
4. **Given** an order has been hidden from history, **When** the customer accesses the order via a direct link or past notification, **Then** the order details remain readable and "Order Again" remains functional.

---

### User Story 7 - Resilient Concurrent Advancement Handling (Priority: P3)

In scenarios where a customer cancels an order at the exact millisecond that the assigned driver taps "Advance Status" (e.g. driver attempting to mark "Preparing" or "Out for Delivery" while cancellation is in flight):
- **Clean Failure**: The driver's app receives a clean, structured response indicating that the order is no longer in the expected state.
- **No Crash / Raw Database Error**: The system must NOT surface a raw unhandled exception, SQL error, or broken dialog to the driver.
- **Graceful UI Transition**: The driver's interface smoothly reflects that the order was cancelled by the customer, clears the active delivery view, and allows the driver to return to the available pool.

**Why this priority**: High-concurrency race conditions must be handled gracefully to ensure a robust, professional driver experience in real-world mobile network conditions.

**Independent Test**: Simulate concurrent execution of a status advance and a cancellation. Verify that the advance operation fails gracefully with a handled message ("Order is no longer active") instead of an unhandled database exception dialog.

**Acceptance Scenarios**:

1. **Given** an order is in `accepted` status, **When** a customer cancellation and a driver status-advance arrive concurrently, **Then** exactly one operation succeeds, and the losing operation returns a handled status rather than an unhandled system fault.
2. **Given** a driver's status-advance request fails because the customer cancelled the order immediately prior, **When** the driver views their screen, **Then** the app displays "Customer cancelled this order" and transitions cleanly to the inactive state.

---

### Edge Cases

- **Cancellation at boundary of delivery**: If a customer taps cancel while the driver is marking the order `delivered`, the server transaction determines the winner. If `delivered` commits first, the cancellation is rejected with "Order has already been delivered." If cancellation commits first, the delivery advance is rejected with "Order has been cancelled."
- **Expiration job down or delayed**: If the background scheduled expiration task is delayed or temporarily suspended, drivers still cannot claim orders older than 30 minutes because the claim operation independently verifies age against current server time.
- **Network disconnection during cancellation**: If a customer cancels while offline, the app alerts the user that a network connection is required to cancel orders. Client devices cannot optimistically set order status to `cancelled`.
- **Multiple rapid taps on Cancel**: Multiple rapid taps on the cancellation button are serialized on the server. The first request transitions the order; subsequent duplicate requests return cleanly without errors or redundant state transitions.
- **Order Again with modified store menu**: If a restaurant has modified item prices, removed add-ons, or closed their store since the expired order was placed, the "Order Again" process revalidates against the store's current live state, alerts the customer to discrepancies, and prevents checkout if the store is currently closed or items are missing.
- **Driver in poor connectivity when cancellation occurs**: If the driver loses internet connectivity while holding an order that gets cancelled, upon restoring connectivity the active order screen immediately detects the `cancelled` status, alerts the driver, and releases local active delivery tracking.
- **Customer with no registered push tokens when order expires**: The order still transitions to `expired` cleanly on the server; the notification pipeline logs the event without blocking or failing the state change.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Order Cancellation & Lifecycle Transition Rules
- **FR-001**: The system MUST allow an authenticated customer to cancel their own order when the order is in any of the following lifecycle states: `pending`, `accepted`, `preparing`, and `out_for_delivery`.
- **FR-001a**: The database order transition trigger (`validate_order_transition`) MUST be updated to restore and add the transition edges: `accepted → cancelled`, `preparing → cancelled`, and `out_for_delivery → cancelled`, in addition to `pending → expired`. Terminal states `delivered`, `cancelled`, and `expired` MUST remain default-denied with no outgoing transitions.
- **FR-001b**: Reopening the `accepted/preparing/out_for_delivery → cancelled` edges in `validate_order_transition` is permitted and safe ONLY because direct client table UPDATE access is denied by RLS, and all cancellation mutations are strictly gated behind the `cancel_order()` RPC which independently enforces caller authentication and customer ownership (`customer_id = auth.uid()`).
- **FR-001c**: The raised exception `hint` in `validate_order_transition` MUST be updated from the legacy 003 string (`'Cancelled is reachable only from pending (customer cancel)'`) to reflect the new lifecycle reality (`'Cancelled is reachable from pending, accepted, preparing, out_for_delivery via customer cancel'`).
- **FR-001d**: The client-side domain transition map `VALID_TRANSITIONS` in `OrderStatus.ts` MUST be updated simultaneously to maintain mandatory 1:1 parity with `validate_order_transition` (as established in feature 003), adding `OrderStatus.Cancelled` to the allowed transitions for `Accepted`, `Preparing`, and `OutForDelivery`, and adding `OrderStatus.Expired` to `Pending`.
- **FR-002**: The system MUST reject any customer cancellation attempt if the order is in `delivered`, `cancelled`, or `expired` status.
- **FR-003**: Customer cancellation MUST be server-authoritative and atomic. The client application MUST NOT be granted direct write access to update order status to `cancelled`.
- **FR-004**: The cancellation operation MUST verify that the authenticated user is the owner of the order (`customer_id = auth.uid()`). Any request for an order owned by another user MUST be rejected with an authorization error.
- **FR-005**: All customer-initiated cancellation write paths MUST be consolidated exclusively into the server-authoritative `cancel_order()` RPC. The legacy live policy `orders_update_own_customer_cancel` on `public.orders` (originating from feature 001) MUST be explicitly dropped by name (`DROP POLICY IF EXISTS orders_update_own_customer_cancel ON public.orders;`) to eliminate parallel write paths.
- **FR-006**: When a customer cancels an order that has an assigned driver, the system MUST immediately remove the order from counting as the driver's active delivery, permitting the driver to accept new orders without manual intervention.

#### Order Expiration Rules
- **FR-007**: An unclaimed order in `pending` status whose age exceeds 30 minutes MUST automatically transition from `pending` to `expired`.
- **FR-008**: Order age MUST be calculated strictly using the server-generated `created_at` timestamp against current server time (`now()`), never device or client time.
- **FR-009**: The 30-minute expiration threshold MUST be defined in a single source of truth on the server and referenced consistently across the automated expiration job, the live order claim validation, and the available orders query.
- **FR-010**: The automated expiration mechanism MUST be server-side, executing on a scheduled recurring interval (every 1 to 2 minutes) to atomically transition eligible stale pending orders.
- **FR-011**: The system MUST prevent an expired or stale pending order (age > 30 minutes) from being claimed by any driver, even if the scheduled background expiration job has not yet run.
- **FR-012**: `expired` MUST be represented as a distinct, 8th terminal status in the order lifecycle status enum, separate from the unused `rejected` status.

#### Driver Pool & Real-Time Propagation
- **FR-013**: When an order transitions from `pending` to `cancelled` or `expired`, the system MUST emit a real-time signal removing the order from the Driver Available Orders pool without requiring a manual refresh.
- **FR-014**: The available orders query MUST filter out any order whose age exceeds the 30-minute threshold, in addition to existing driver eligibility and availability rules.
- **FR-015**: When a customer cancels an order that has an assigned driver, the driver's active order view MUST reflect the cancellation in real time and display "Customer cancelled this order".
- **FR-016**: The driver status-advance operation MUST validate that the order remains in the expected current status during the atomic update, returning a clean, handled failure if the order was cancelled concurrently.

#### Push Notifications & Actor Awareness
- **FR-017**: When an order with an assigned driver is cancelled by the customer, the system MUST dispatch an `order_cancelled_by_customer` push notification to the assigned driver's registered active devices.
- **FR-018**: The system MUST identify the cancellation actor at the transaction level via a dedicated GUC (`app.cancellation_actor = 'customer'`). When the order status moves to `cancelled`:
  - If `app.cancellation_actor = 'customer'`: the system MUST suppress the customer-facing cancellation push notification to prevent confusing self-echo, and dispatch `order_cancelled_by_customer` to the assigned driver if one exists.
  - If `app.cancellation_actor` is NOT `'customer'` (preserving the branch for future restaurant/admin/system cancellations): the existing customer-facing `order_cancelled` push notification MUST remain active so the customer is alerted when another actor cancels their order.
- **FR-019**: When an unclaimed pending order transitions to `expired`, the system MUST dispatch an `order_expired` push notification to the customer's registered active devices.
- **FR-020**: All new notification events (`order_cancelled_by_customer`, `order_expired`) MUST reuse the existing transaction-sequence deduplication mechanism (`order_id:event_type:event_seq`) to prevent duplicate dispatches.
- **FR-021**: Push notification titles and bodies MUST be human-readable, context-aware, and composed in the recipient device's locale (Arabic and English at minimum). Driver cancellation notifications MUST NOT use sequential human order numbers (orders have no customer-facing order numbers); they MUST identify the store using the restaurant name snapshot (`restaurant_name`):
  - English: Title: `"Order cancelled"`, Body: `"The customer cancelled your order from {restaurant_name}"`
  - Arabic: Title: `"تم إلغاء الطلب"`, Body: `"قام العميل بإلغاء طلبك من {restaurant_name}"`
  Driver cancellation notifications MUST NOT expose customer phone numbers, delivery addresses, or personal PII.

#### Order History Hiding & Reordering ("Order Again")
- **FR-022**: The system MUST allow an authenticated customer to hide an order from their visible order history via a dedicated server-authoritative operation.
- **FR-023**: Hiding an order MUST NOT physically delete the order row, order items, add-on snapshots, financial records, or address snapshots from the database.
- **FR-024**: Customer order history queries MUST exclude any orders marked as hidden by the customer.
- **FR-025**: The order hiding operation MUST verify that the authenticated user owns the order (`customer_id = auth.uid()`). A user MUST NOT be permitted to hide another user's order.
- **FR-026**: The system MUST provide an "Order Again" action for expired and past orders in the customer order history.
- **FR-027**: "Order Again" MUST rebuild the customer's cart from historical snapshots, revalidate all items and add-ons against current catalog availability and pricing, and require explicit customer confirmation at checkout before creating a new order. It MUST NEVER automatically persist or create an order.
- **FR-028**: If "Order Again" is triggered when the cart contains items from a different store, the system MUST invoke the existing single-store cart conflict prompt and MUST NOT silently replace cart contents.

---

### Key Entities

- **Order**: Represents the commercial transaction.
  - *Attributes*: `id`, `customer_id`, `driver_id`, `restaurant_id`, `restaurant_name`, `status`, `delivery_address`, `delivery_address_label`, `payment_method`, `coupon_code`, `discount_amount`, `subtotal_amount`, `delivery_fee`, `total_amount`, `created_at`, `accepted_at`, `delivered_at`, `updated_at`, `customer_hidden_at`, `event_seq`.
  - *Lifecycle States*: `pending`, `accepted`, `preparing`, `out_for_delivery`, `delivered` (terminal), `cancelled` (terminal), `rejected` (terminal, reserved), `expired` (terminal).
  - *Visibility*: Normal customer order history excludes orders where `customer_hidden_at` is set.
- **Order Status Enum**:
  - Contains: `'pending'`, `'accepted'`, `'preparing'`, `'out_for_delivery'`, `'delivered'`, `'cancelled'`, `'rejected'`, `'expired'`.
- **Driver Pool Signal**:
  - Captures order pool entry/exit events for driver real-time feeds without leaking customer PII.
  - *Signals*: `'order_added'`, `'order_claimed'`, `'order_released'`. Both cancellation and expiration trigger pool exit.
- **Notification Event**:
  - Server-side durable record of an event requiring push notification delivery.
  - *Event Types*: `new_order_pool`, `order_accepted`, `order_preparing`, `order_out_for_delivery`, `order_delivered`, `order_cancelled`, `order_released`, `order_cancelled_by_customer`, `order_expired`.
  - *Target Roles*: `customer`, `driver`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customer cancellation requests for eligible orders (`pending`, `accepted`, `preparing`, `out_for_delivery`) are processed and confirmed by the server in under 1.5 seconds under normal network conditions.
- **SC-002**: 100% of cancelled or expired pending orders are removed from Driver Available Orders in real time within 1 second across connected driver devices.
- **SC-003**: 100% of assigned drivers receive active in-app notice and an `order_cancelled_by_customer` push notification when an active order is cancelled by the customer, provided the driver has an active registered push token.
- **SC-004**: 0% of customer cancellations generate a self-echo push notification to the customer who initiated the cancellation.
- **SC-005**: 100% of unclaimed orders exceeding the 30-minute threshold are prevented from being claimed by drivers, regardless of whether the scheduled expiration job has run.
- **SC-006**: 100% of expired orders result in an `order_expired` push notification dispatched to the customer's active devices within 3 seconds of the expiration state change.
- **SC-007**: 0% of orders removed from customer history are physically deleted from the database; 100% of financial, snapshot, and timestamp records remain intact for auditability.
- **SC-008**: 100% of "Order Again" actions require explicit customer checkout confirmation; 0% of reorders are auto-created without customer review.
- **SC-009**: In 100% of concurrent race conditions between customer cancellation and driver status advancement, the driver application receives a handled, user-friendly outcome without encountering unhandled database exceptions.
- **SC-010**: 0% of attempts by a customer to cancel or hide an order belonging to another customer succeed.

---

## Assumptions

- **Single Store Constraint**: The project enforces a single-store-per-cart rule. "Order Again" respects this constraint by routing through the existing `StoreConflictModal` when replacing cart contents.
- **Cash on Delivery**: Cash on delivery remains the sole payment method. No online payment refunds or payment gateway cancellations are required for cancelled orders.
- **No Direct Driver Cancellation**: Drivers cannot cancel orders. Drivers may only release orders back to the pool with a mandatory reason (established in feature 003).
- **Postgres Authority**: Supabase Postgres remains the single source of truth for order state transitions, authorization, and timestamps (Principle V).
- **Scheduled Job Execution**: Server-side scheduled tasks are managed via `pg_cron` (installed in the database environment) executing every 1 to 2 minutes.
- **Realtime vs Push Separation**: Realtime subscriptions drive live in-app screen updates, while the push notification pipeline handles background/out-of-app alerts (Principle VIII).
- **Actor-Aware GUC Pattern**: A dedicated transaction-scoped configuration (`app.cancellation_actor`) identifies the cancellation source during execution to enable selective notification dispatch and suppress self-echoes.

---

## Clarifications

### Feature 005 Alignment Decisions

- **Q: Which order statuses are cancellable by the customer?**
  - **Decision**: `pending`, `accepted`, `preparing`, and `out_for_delivery`. Cancellation is NOT allowed after `delivered`, `cancelled`, or `expired`. Allowing cancellation during `out_for_delivery` is an explicit product decision.
- **Q: How is the database trigger validate_order_transition modified?**
  - **Decision**: The transition edges `accepted → cancelled`, `preparing → cancelled`, and `out_for_delivery → cancelled` are explicitly restored/added alongside `pending → expired`. This deliberately reverses the edge closure implemented during feature 003. This is secure because direct client UPDATE policies on `orders` remain completely blocked, and cancellation is exclusively reachable via the server-authoritative `cancel_order()` RPC which verifies `customer_id = auth.uid()`. The trigger exception hint string is updated to `'Cancelled is reachable from pending, accepted, preparing, out_for_delivery via customer cancel'`, and `VALID_TRANSITIONS` in `OrderStatus.ts` is updated in lockstep to maintain strict 1:1 parity.
- **Q: How is customer cancellation enforced securely and how are legacy policies handled?**
  - **Decision**: Via a dedicated server-authoritative RPC (`cancel_order(order_id)`) that verifies `customer_id = auth.uid()`. The live legacy policy `orders_update_own_customer_cancel` on `public.orders` (from feature 001) MUST be explicitly dropped by name to eliminate parallel client-side write paths.
- **Q: What is the fate of the existing order_cancelled notification branch?**
  - **Decision**: In `enqueue_order_notification()`, the transition into `cancelled` checks `app.cancellation_actor`. If `app.cancellation_actor = 'customer'`, the customer-facing alert is suppressed (no self-echo) and the driver-facing `order_cancelled_by_customer` event is generated if an assigned driver exists. If `app.cancellation_actor` is NOT `'customer'` (reserving for future restaurant/admin/system cancellations), the existing customer-facing `order_cancelled` push notification branch remains active.
- **Q: How is the driver cancellation push notification formatted?**
  - **Decision**: Driver notifications must NOT use human order numbers (e.g. "order #1234"), as Sari3 orders have no sequential human-readable numbers. Like feature 004 templates, it identifies the store via `restaurant_name`: English: `"The customer cancelled your order from {restaurant_name}"`, Arabic: `"قام العميل بإلغاء طلبك من {restaurant_name}"`.
- **Q: How is pending order expiration timed and enforced?**
  - **Decision**: Stale pending orders expire after 30 minutes. The 30-minute interval is defined in a single source of truth (`public.pending_order_ttl()`) and checked by: (1) scheduled `pg_cron` background job, (2) live check inside `claim_order()`, and (3) filter in `get_available_orders()`.
- **Q: How is `expired` modeled in the database?**
  - **Decision**: As a new 8th value in `order_status` enum. Because Postgres requires enum additions to be committed before reference in statements, this requires two sequenced migrations: Migration A adds the enum value, Migration B references it in functions/triggers.
- **Q: How does customer history removal work?**
  - **Decision**: Via a dedicated RPC (`hide_order(order_id)`) setting `customer_hidden_at = now()`. Physical rows and snapshots are never deleted. Order history queries filter `customer_hidden_at IS NULL`.
- **Q: How does "Order Again" work?**
  - **Decision**: Rebuilds the cart from item snapshots, revalidates availability and prices against the live store catalog, prompts if a single-store conflict exists, and requires explicit customer placement at checkout. Never auto-creates orders.
- **Q: How is the concurrent driver status-advance vs customer cancellation race handled?**
  - **Decision**: The driver status advancement function (`advance_order_status`) widens its WHERE clause to include `AND status = v_current_status`, so an interleaved cancellation produces a clean, handleable failure rather than a raised database trigger exception.
