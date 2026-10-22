# Feature Specification: Order Placement Idempotency

**Feature Branch**: `011-order-placement-idempotency`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "create a specification for i want to create and all details in this file: @[mds/order-placement-idempotency.md]"

## Clarifications

### Session 2026-10-19

- Q: How should the server handle an order placement request that reuses an existing idempotency key with a materially different payload? → A: Return the existing order without comparing payloads (Pure Replay), relying on client-side intent fingerprinting to generate fresh keys whenever purchase details change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Safe Checkout Retry After Lost Response or Network Failure (Priority: P1)

As a customer placing an order on an unstable mobile network, I want to retry confirming my order when a network connection drops or times out without worrying that my card or account will be charged twice, that multiple orders will be sent to the kitchen, or that my single-use discount coupon will be burned twice.

**Why this priority**: Preventing duplicate financial commitments, duplicate physical food preparations, and multi-redemption of scarce coupon discounts is foundational to system integrity and customer trust.

**Independent Test**: Simulate an order submission where the server commits the order successfully but drops the network connection before delivering the response. Tap "Confirm Order" a second time: the customer receives an identical order confirmation, exactly one order exists in the store dispatch pool, one coupon redemption is counted, and the customer is routed directly to the tracking screen.

**Acceptance Scenarios**:

1. **Given** a customer submits checkout for a store with items and a valid usage-limited coupon, **When** the order is committed by the server but the client disconnects before receiving the acknowledgment, and the customer taps confirm again with the same cart and address, **Then** the original order confirmation is returned without creating a second order or consuming a second coupon redemption.
2. **Given** an order has been successfully created and acknowledged, **When** a repeated request with the same idempotency key is submitted for the same customer, **Then** the system returns the original order confirmation payload matching the initial creation response.
3. **Given** a checkout request with an invalid, empty, or missing idempotency identifier, **When** the order placement operation is received, **Then** the request is rejected with a distinct error code (`MISSING_IDEMPOTENCY_KEY`) and no order or side effects are created.

---

### User Story 2 - Rapid Double-Tap Protection During Order Confirmation (Priority: P1)

As a mobile app customer, when I rapidly tap or accidentally double-tap the "Confirm Order" button on checkout, I want the application and server to treat my action as a single submission so that only one order is placed.

**Why this priority**: Mobile touch interfaces frequently suffer from physical multi-touch bounces or rapid user taps before UI buttons disable; this scenario causes immediate real-world order duplication unless guarded synchronously on the client and serialized atomically on the server.

**Independent Test**: Fire two rapid taps or trigger two simultaneous checkout requests with the same purchase intent and key concurrently. Exactly one order is created, one driver pool signal is dispatched, and both submission attempts resolve to the single order ID.

**Acceptance Scenarios**:

1. **Given** a customer is on the checkout screen with a selected address, **When** the customer rapidly taps the confirmation button multiple times in sub-second succession, **Then** the client synchronously blocks subsequent taps while the initial submission is in flight.
2. **Given** two concurrent order placement requests with the same customer ID and idempotency key arrive at the backend simultaneously, **When** both are processed, **Then** backend concurrency serialization ensures exactly one order is written to storage and both requests return the identical order confirmation.

---

### User Story 3 - Persistence of Checkout Intent Across App Kill and Restart (Priority: P1)

As a customer whose device battery dies, OS kills the app in the background, or who closes the app immediately after pressing "Confirm Order", I want my pending checkout key and intent preserved upon reopening so that if the order was already placed I recover it safely, and if it was not placed my retry does not risk a race condition.

**Why this priority**: In real-world delivery apps, mobile operating systems frequently reclaim memory or kill background apps during network round-trips. Without persistent intent tracking, restarting the app would generate a fresh key and create an unavoidable duplicate.

**Independent Test**: Stage an order in the checkout screen, initiate checkout, terminate the app process immediately, reopen the app, and tap confirm again. The app reuses the persisted intent key, detects the previously committed order, and navigates the user to the active order tracking screen without creating a second order.

**Acceptance Scenarios**:

1. **Given** a checkout attempt has generated an idempotency key and purchase intent fingerprint, **When** the mobile application process is terminated and subsequently relaunched, **Then** the stored key and purchase intent fingerprint hydrate together with the persisted shopping cart.
2. **Given** the app is relaunched after an unacknowledged order placement attempt, **When** the user taps confirm with an unchanged cart and address, **Then** the system transmits the persisted idempotency key and recovers the existing order.
3. **Given** an order placement operation successfully completes and returns an order confirmation, **When** the confirmation is acknowledged, **Then** the active idempotency key and intent fingerprint are cleared from storage alongside the cart.

---

### User Story 4 - Automatic Key Rotation on Cart or Checkout Modifications (Priority: P2)

As a customer who decides to change an item, choose a different delivery address, or add a coupon after an initial checkout error, I want the system to recognize that my purchase intent has changed so that my updated order can be confirmed without being mistaken for a replay of the previous attempt.

**Why this priority**: If an idempotency key were bound permanently to a checkout screen session rather than to the exact purchase intent, any customer who corrected an address or modified items after a failure would mistakenly receive the stale initial order rather than their desired changes.

**Independent Test**: Attempt checkout, encounter a recoverable failure (e.g., store temporarily busy or network glitch), change the delivery address or add an extra item to the cart, and confirm again. A new key is generated, and a new order reflecting the modified items and address is placed.

**Acceptance Scenarios**:

1. **Given** an order placement attempt previously failed and recorded an idempotency key with an intent fingerprint, **When** the user alters the cart items, quantities, delivery address, or coupon code, **Then** the system detects a fingerprint mismatch and generates a fresh idempotency key for the subsequent confirmation attempt.
2. **Given** two distinct purchase intents with identical items and quantities placed sequentially by the same customer (e.g., ordering lunch for two different family members), **When** each purchase completes and the cart is cleared between them, **Then** each distinct checkout generates a unique idempotency key resulting in two separate, valid orders.

---

### User Story 5 - Multi-Customer and Tenant Scoping Isolation (Priority: P2)

As a system security and privacy stakeholder, I want idempotency keys to be strictly isolated by customer account, so that a customer cannot discover, conflict with, or hijack another customer's orders even if keys coincide.

**Why this priority**: Multi-tenant security mandates that resource lookups by client-supplied keys must never bridge customer boundaries.

**Independent Test**: Submit an order for Customer A with a specific idempotency key. Then, authenticate as Customer B and submit an order using the exact same key string. Customer B's order is created independently without seeing Customer A's order details or conflicting with Customer A's record.

**Acceptance Scenarios**:

1. **Given** Customer A has placed an order with Key X, **When** Customer B submits an order with the same Key X, **Then** Customer B's submission creates Customer B's own order, and neither customer receives data belonging to the other.
2. **Given** an unauthenticated caller or a caller with an invalid session, **When** an order placement request is submitted with an idempotency key, **Then** the request is rejected prior to evaluating or recording the key.

---

### User Story 6 - Elimination of Blind Mutation Retries on Unknown Network Outcomes (Priority: P3)

As a customer or driver performing state-changing operations on an unstable network, I want the client data layer to refrain from automatically re-transmitting mutations in the background when network connectivity drops, so that uncertain server writes are never blindly duplicated.

**Why this priority**: Automatic client retries for write mutations violate the safety principle of unknown outcomes: if the write succeeded on the server but the acknowledgement was lost, a blind retry causes duplicate actions unless every endpoint is perfectly idempotent.

**Independent Test**: Trigger a state mutation when the network connection is interrupted after server dispatch. Verify that the client data layer does not automatically fire a second background request, leaving retry control to the user or application logic.

**Acceptance Scenarios**:

1. **Given** a state-changing mutation encounters a transient network error or timeout, **When** the outcome is unknown, **Then** the application client does not automatically re-send the mutation in the background (retry count is 0).

---

### Edge Cases

- **Concurrent submissions with identical key**: When two identical requests hit the server at the exact same millisecond, transactional serialization guarantees that exactly one order row is inserted; the second transaction observes the existing order and returns it as a replay.
- **Key sent with altered payload**: If an identical key is received by the server with a materially altered payload (e.g. bypassed or desynchronized client fingerprinting), the server defaults to returning the original order tied to that key without comparing payloads (pure replay semantics), avoiding complex or fragile server payload hashing while relying on the client's intent fingerprinting rule to issue new keys for modified orders.
- **Legacy order rows without idempotency keys**: Historical orders created before this feature lack an idempotency key; database constraints and unique indexes allow null values so legacy records remain valid and queryable.
- **Order placement failure before commit**: If a validation rule fails on the initial attempt (e.g. `STORE_CLOSED`, `COUPON_EXPIRED`), no order row is saved and no idempotency key is permanently recorded; the customer can fix the issue and retry with a fresh or matching key.
- **Immutability of idempotency key**: Once written to an order record, the idempotency key column cannot be modified or updated by any subsequent operation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST require a valid, non-empty, unique client-provided idempotency key (`idempotency_key`) for every order placement request.
- **FR-002**: If an order placement request is received without a valid idempotency key, the system MUST reject the request with the specific error code `MISSING_IDEMPOTENCY_KEY` and perform no state changes.
- **FR-003**: The system MUST enforce that the combination of authenticated customer identifier and idempotency key is strictly unique across all orders.
- **FR-004**: When an order placement request is received with a customer identifier and idempotency key that has already been successfully committed, the system MUST return the previously created order confirmation in the exact same response structure as the initial call (pure replay semantics), without comparing incoming payload contents against the original order.
- **FR-005**: A replayed order placement request MUST NOT:
  - Create a new order row.
  - Create additional order item records.
  - Re-evaluate catalog prices or totals.
  - Increment or consume a second redemption on any applied coupon.
  - Create duplicate coupon redemption records.
  - Enqueue additional driver pool signals.
  - Enqueue additional order status notification events.
- **FR-006**: The system MUST serialize concurrent order placement requests bearing the identical customer identifier and idempotency key at the database transaction level to guarantee that race conditions cannot create duplicate orders.
- **FR-007**: The system MUST scope all idempotency key lookups and uniqueness checks strictly to the authenticated caller's account, preventing key collisions or information leakage across different customers.
- **FR-008**: The client application MUST generate an idempotency key lazily at the moment the customer initiates the order confirmation action, rather than upon initial screen load.
- **FR-009**: The client application MUST compute a deterministic purchase intent fingerprint comprising the store identifier, item identifiers with their quantities and chosen add-ons, the selected delivery address identifier, and the applied coupon code.
- **FR-010**: The client application MUST persist the active idempotency key and its corresponding purchase intent fingerprint in local storage alongside the shopping cart state so that it survives application restarts and crashes.
- **FR-011**: When an order confirmation is triggered, the client application MUST compare the current purchase intent fingerprint against the stored fingerprint:
  - If identical, the client MUST reuse the existing idempotency key.
  - If different or absent, the client MUST generate a fresh unique key and store it with the updated fingerprint.
- **FR-012**: The client application MUST clear the active idempotency key and intent fingerprint only upon receiving a confirmed order response (initial creation or successful replay).
- **FR-013**: The client checkout interface MUST provide a synchronous in-flight guard to prevent multiple rapid button presses from dispatching concurrent network requests.
- **FR-014**: The client data-fetching and mutation configuration MUST disable automatic retries (`retry = 0`) for mutating operations, ensuring that operations with unknown network outcomes are not blindly repeated.
- **FR-015**: The system MUST ensure that order idempotency keys are immutable once recorded on an order record.

### Key Entities

- **Order (with Idempotency Key)**: Represents the customer's committed purchase. Includes the unique order identifier, customer identifier, store identifier, financial snapshots, status, and the `idempotencyKey` that uniquely identifies the placement transaction for that customer.
- **Checkout Purchase Intent**: A client-side representation combining:
  - `idempotencyKey`: A unique UUID identifying the current order confirmation attempt.
  - `intentFingerprint`: A deterministic hash or serialized representation of the purchase details (store ID, item IDs, variant IDs, add-on IDs, quantities, delivery address ID, coupon code).
  - Hydrated and persisted alongside the local shopping cart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of repeated or retried checkout submissions using the same idempotency key result in exactly 1 created order and exactly 1 coupon redemption, verified under both sequential and concurrent execution.
- **SC-002**: 0 duplicate orders created when simulated mobile network disconnections drop order placement responses mid-flight.
- **SC-003**: 0 duplicate orders created during rapid multi-tap interactions on the checkout confirmation control.
- **SC-004**: 100% of order placement requests lacking an idempotency key are rejected before executing any business logic or database writes.
- **SC-005**: Checkout recovery time across app restarts for pending orders requires no duplicate data entry; tapping confirm immediately resolves to the existing order in under 2 seconds on standard mobile connectivity.

## Assumptions

- The application is in pre-launch stage; all incoming order placement requests originate from modern clients capable of generating and sending idempotency keys, so backward compatibility for keyless placement is explicitly not required.
- Legacy order rows in the database without idempotency keys remain valid via nullable column support.
- Idempotency keys are formatted as standard UUID strings.
- Network timeouts or drops on write operations represent unknown outcomes; user-initiated retry with guaranteed idempotency is the safest recovery mechanism.
- The server does not perform deep cryptographic payload comparison on replayed keys; the client-side fingerprinting rule ensures that modified carts receive fresh keys, while server-side key reuse returns the original order.
