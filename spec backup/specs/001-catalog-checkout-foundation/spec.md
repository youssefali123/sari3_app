# Feature Specification: Catalog and Checkout Foundation

**Feature Branch**: `001-catalog-checkout-foundation`

**Created**: 2026-09-16

**Last Revised**: 2026-09-16

**Status**: Draft

**Input**: Extension of the Sari3 customer ordering experience — store types, product categories & add-ons, favorites, promotions & coupons, saved delivery addresses, single-store cart, checkout flow (cash on delivery), immutable order items, and scoped driver info.

---

## Overview

This specification defines the requirements for the full customer ordering experience in the Sari3 multi-store delivery app. It covers two store types (Restaurant and Market) under a single, unified purchasing model; product categories with optional add-ons; a favorites system for stores and products; promotional offers and coupon codes; saved delivery addresses; a single-store cart with conflict resolution; a complete checkout flow (cash on delivery); immutable order-item snapshots created and owned by the server; and order-scoped driver information access.

All domain rules are enforced server-side per the project constitution. This document describes **what the system must do**, not how it is implemented. Implementation and database design decisions belong in `plan.md`.

---

## Clarifications

### Session 2026-09-16

- Q: Which specific order lifecycle statuses qualify as an active or eligible state for customer access to driver contact details? (FR-021) → A: From driver acceptance through delivery (`accepted`, `preparing`, `out_for_delivery`); revoked upon `delivered`, `cancelled`, or `rejected`.
- Q: Are product add-ons binary selections (selected or unselected), or can customers choose multiple quantities of the same add-on? (BR-003) → A: Binary selection only (each add-on is either selected or not; max quantity of 1 per add-on per cart item).
- Q: Can a customer apply only a single coupon code per order, or can multiple coupon codes be combined on the same order? (FR-013) → A: Single coupon only (at most one coupon code per order; entering a new code replaces any previously entered code).
- Q: Can customers add items to their cart or place orders from a store that is currently marked as closed? (BR-001) → A: Hard block: Catalog browsing is permitted, but adding items to the cart and submitting orders are blocked when a store is closed (enforced server-side at order placement).
- Q: How should delivery fees be factored into the order total calculation during checkout for this foundation phase? (BR-005) → A: Zero delivery fee for the foundation phase (order total = item subtotal minus coupon discount; dynamic/store delivery fees deferred).

---

## Constitutional Alignment

This feature operates under the Sari3 Constitution v1.0.0. The following principles directly govern this specification:

- **Principle I** — Feature-first folder structure; no layer-only directories.
- **Principle II** — Lightweight Clean Architecture per feature; Domain/Application layers must not import infrastructure libs.
- **Principle III** — Fixed dependency direction: Presentation → Application → Domain ← Infrastructure.
- **Principle IV** — TanStack Query owns all server state; Redux Toolkit owns cart (client-local) state only.
- **Principle V** — Server is the final authority for prices, coupon validity, and order totals.
- **Principle VI** — Concurrency-critical writes (order placement, coupon redemption) MUST be atomic at the database level.
- **Principle VII** — Historical records are immutable snapshots; edits to source records must never alter historical orders.
- **Principle VIII** — Realtime and push are separate concerns; use cases reference only Domain-owned service interfaces.
- **Principle IX** — Architecture remains extensible for deferred capabilities (GPS, online payments, Admin) without rewrites.
- **Principle X** — Practical MVP simplicity; avoid unnecessary abstractions.

---

## User Scenarios & Testing

### User Story 1 — Browse Stores and Place Order with Add-ons (Priority: P1)

A logged-in customer opens the home screen, sees both restaurants and markets, taps a store, browses product categories, selects a product with add-ons, adds it to the cart, proceeds through checkout (choosing a saved address and cash on delivery), optionally applies a coupon, reviews the server-validated total, and places the order.

**Why this priority**: This is the core end-to-end value proposition of the app. All other stories depend on this flow being stable.

**Independent Test**: Can be fully tested by a customer who browses a restaurant, adds one product with at least one add-on, and successfully places an order — delivering a confirmed order with an immutable item snapshot.

**Acceptance Scenarios**:

1. **Given** the home screen is loaded, **When** the customer views the store list, **Then** both restaurants and markets are displayed together and visually distinguishable by type.
2. **Given** a store page is open, **When** the customer taps a category tab, **Then** only products belonging to that category are shown.
3. **Given** a product detail page with add-ons, **When** the customer selects a combination of add-ons and taps "Add to Cart", **Then** a cart entry is created that captures the product identity plus the selected add-on combination.
4. **Given** the same product is added twice with different add-on selections, **When** the cart is viewed, **Then** two distinct cart entries are present (not merged).
5. **Given** checkout is started, **When** the customer selects a saved address, picks cash on delivery, optionally enters a coupon code, and submits the order request, **Then** the server validates availability, recalculates prices and any coupon discount, computes the authoritative final total, creates all immutable snapshots, and persists the order atomically.
6. **Given** an order is placed successfully, **When** the order is later retrieved, **Then** order items reflect the product name, price, add-on names, and add-on prices that the server captured at the time of order placement — not current catalog values.
7. **Given** a store is marked as closed, **When** the customer views its products, **Then** adding items to the cart is disabled and order placement is blocked.

---

### User Story 2 — Single-Store Cart Conflict Resolution (Priority: P2)

A customer has items from Store A in their cart and attempts to add a product from Store B.

**Why this priority**: Without this rule the ordering model breaks. This is a core business rule that must work before any complex flows are built.

**Independent Test**: Can be tested by adding a product from one store, then attempting to add from another — the conflict prompt appears, and both confirm and decline paths work correctly.

**Acceptance Scenarios**:

1. **Given** the cart contains items from Store A, **When** the customer attempts to add a product from Store B, **Then** a confirmation dialog is shown explaining that the cart will be cleared.
2. **Given** the conflict dialog is shown, **When** the customer confirms, **Then** the cart is cleared and the new product from Store B is added.
3. **Given** the conflict dialog is shown, **When** the customer declines, **Then** the cart is unchanged and no product from Store B is added.
4. **Given** the cart is empty, **When** the customer adds a product from any store, **Then** no conflict dialog appears.

---

### User Story 5 — Saved Delivery Addresses (Priority: P2)

A customer manages their saved addresses and selects one at checkout.

**Why this priority**: Required for checkout completion; a customer cannot place an order without a delivery address.

**Independent Test**: Can be tested by adding a saved address, proceeding to checkout, selecting that address, and placing an order — verifying that the placed order records the address text independently of the saved address record.

**Acceptance Scenarios**:

1. **Given** the customer's addresses screen, **When** the customer adds a new address, **Then** it appears in their saved address list.
2. **Given** a saved address exists and an order has been placed using it, **When** the customer edits or deletes the saved address, **Then** the previously placed order still shows the original address.
3. **Given** checkout, **When** the customer selects a saved address, **Then** the text of that address is recorded immutably on the order at placement time.
4. **Given** the checkout address step, **When** the customer has no saved addresses, **Then** the customer is prompted to add one before proceeding.

---

### User Story 3 — Store and Product Favorites (Priority: P3)

A customer can favorite/unfavorite stores and products independently, and browse each favorites list separately.

**Why this priority**: Favorites drive re-engagement and repeat orders. Lower priority than core ordering but important for retention.

**Independent Test**: Can be tested by favoriting a store and a product, navigating to each favorites list, and verifying they appear independently.

**Acceptance Scenarios**:

1. **Given** a store page, **When** the customer taps the favorite toggle, **Then** the store is added to the customer's Favorite Stores list.
2. **Given** a product, **When** the customer taps the favorite toggle, **Then** the product is added to the customer's Favorite Products list.
3. **Given** a store or product is already favorited, **When** the customer taps the favorite toggle again, **Then** it is removed from the respective favorites list.
4. **Given** the customer navigates to the Favorite Stores screen, **Then** only favorited stores are shown (both restaurants and markets may appear).
5. **Given** the customer navigates to the Favorite Products screen, **Then** only favorited products are shown.

---

### User Story 4 — Promotions and Coupons (Priority: P3)

A customer sees active promotional banners on the home screen. Tapping one reveals the promoted stores or products. At checkout, the customer can optionally enter a coupon code and sees the server-validated discount reflected in the final total.

**Why this priority**: Promotions and coupons are important for business but do not block the core ordering flow.

**Independent Test**: Can be tested by: (a) verifying that promotional banners appear on the home screen and navigate to the correct promoted items; and (b) applying a valid coupon at checkout and confirming the server-computed discount appears in the displayed total.

**Acceptance Scenarios**:

1. **Given** the home screen, **When** active promotions exist, **Then** promotional banners are displayed.
2. **Given** a promotion banner is tapped, **When** the promoted entity is a store, **Then** a page showing the promoted store(s) is displayed.
3. **Given** a promotion banner is tapped, **When** the promoted entity is a product, **Then** a page showing the promoted product(s) is displayed.
4. **Given** checkout, **When** the customer enters a coupon code and submits, **Then** the server determines eligibility and the applicable discount; at most one coupon code may be active per order (entering a new code replaces any previous one), and the client displays only the result returned by the server.
5. **Given** checkout, **When** the server rejects the coupon (invalid, expired, or ineligible), **Then** the client displays the rejection reason and no discount is applied.
6. **Given** checkout, **When** the customer skips the coupon field, **Then** checkout proceeds without a discount.

---

### User Story 6 — Order-Scoped Driver Information (Priority: P4)

A customer with an active order accepted by a driver can view that driver's name, photo, and phone number — and nothing else.

**Why this priority**: Useful for customer trust, but lower priority than completing the order flow.

**Independent Test**: Can be tested by assigning a driver to an active order and verifying that the customer view shows only name, photo, and phone for that specific order — no access to the driver's full profile or other orders.

**Acceptance Scenarios**:

1. **Given** an active order with an assigned driver, **When** the customer views that order's detail screen, **Then** the driver's name, photo, and phone number are visible.
2. **Given** an active order with an assigned driver, **When** the customer views that order, **Then** no other driver profile information is accessible.
3. **Given** an active order with no driver assigned yet, **When** the customer views the order, **Then** driver info is not shown.
4. **Given** an order that has reached `delivered` or `cancelled`, **When** the customer views it, **Then** driver contact information is revoked and not shown.

---

### Edge Cases

- What happens when a customer's session expires mid-checkout? → Order submission must fail gracefully; the customer's cart selections are preserved locally for re-attempt.
- What happens when a product is removed from the catalog after being added to the cart? → The cart entry remains until the customer submits the order; the server rejects placement if the product is no longer available, and the client informs the customer.
- What happens when a coupon reaches its maximum redemptions between the client displaying it and the server processing the order? → The server rejects the coupon; the client displays the rejection reason and does not apply a discount.
- What happens when the customer's cart state diverges across two devices? → Cart state is client-local; each device manages its own cart independently. No cross-device cart sync is required in this scope.
- What happens when a customer deletes their only saved address? → Deletion is allowed at any time; existing order records are unaffected because the address was captured as a snapshot at placement.
- What happens when a product's price changes between the time the customer adds it to the cart and the time the order is submitted? → The server retrieves the canonical price at order creation time; if the displayed estimate differs from the authoritative total, the customer sees the server-computed total before the order is confirmed.
- What happens when the home screen loads but the promotions service is unavailable? → The home screen renders store listings normally; the promotions section degrades gracefully (empty or hidden) without blocking the rest of the screen.
- What happens when a store closes while a customer has items from that store in the cart? → When the customer attempts to submit the order, the server validates store open status and rejects order placement, notifying the customer that the store is currently closed.

---

## Requirements

### Business Rules

- **BR-001**: Restaurants and Markets MUST share the same purchasing model and checkout flow. Separate purchasing architectures for each store type are prohibited. Ordering is permitted only for open stores: customers may browse catalogs of closed stores, but adding items to the cart and submitting orders are blocked, and the server MUST validate that the store is open before persisting an order.
- **BR-002**: A cart MUST contain items from only one store at a time. Attempting to add an item from a different store MUST trigger a store-conflict resolution flow.
- **BR-003**: Cart item identity is defined by the combination of product + the set of selected add-on IDs. Each available add-on is a binary selection (selected or unselected; maximum quantity of 1 per add-on per cart item). Two entries that reference the same product but have different add-on selections are distinct cart items. The order in which add-ons are selected MUST NOT affect cart item identity — `[AddOn 1, AddOn 2]` and `[AddOn 2, AddOn 1]` represent the same selection.
- **BR-004**: At most one coupon code may be applied per order (coupon stacking is prohibited; entering a new code replaces any existing code). Coupon eligibility, the applicable discount, and the final order total are authoritative on the server. The server determines whether a coupon is valid and applicable based on current cart contents, the store, the customer, minimum order thresholds, and any other eligibility rules. Client-side coupon feedback is a UX convenience only and MUST NOT influence the persisted order.
- **BR-005**: At order placement the client submits only the information necessary to request an order: the selected store, product IDs, quantities, selected add-on IDs, the chosen delivery address, the payment method, and an optional coupon code. The server MUST retrieve canonical product and add-on data, validate store open status and item availability, validate coupon eligibility, compute the authoritative discount and final total (`order total = items subtotal - coupon discount`; delivery fees are zero for this foundation phase), create all immutable snapshots, and persist the order atomically. Client-submitted prices, totals, or snapshot content MUST NOT be trusted.
- **BR-006**: Every placed order MUST contain an immutable snapshot of each item as it existed at the time of placement, including: product name, product price, quantity, selected add-on names, and selected add-on prices. Subsequent changes to the catalog (price changes, renames, deletions) MUST NOT affect this snapshot.
- **BR-007**: The delivery address recorded on a placed order MUST be an immutable snapshot captured at order placement time. Editing or deleting a customer's saved address MUST NOT alter any previously placed order's address record.
- **BR-008**: A customer's access to driver information is strictly scoped to a specific order that: (a) belongs to that customer, (b) is in an active fulfillment state (`accepted`, `preparing`, or `out_for_delivery`), and (c) has a driver assigned. Once an order transitions to `delivered`, `cancelled`, or `rejected`, access is revoked. Only the driver's name, photo, and phone number may be exposed in this context. The driver's full profile, other orders, and other drivers MUST NOT be accessible.
- **BR-009**: Order placement and coupon redemption are concurrency-critical operations and MUST be executed atomically at the database level.
- **BR-010**: The single-store cart rule (BR-002) is a business rule. It MUST be enforced in the application layer and MUST NOT exist only in the UI.

### Functional Requirements

- **FR-001**: The system MUST display both restaurants and markets on the home screen under a unified browsing experience.
- **FR-002**: The system MUST allow customers to distinguish store type (restaurant vs. market) visually without navigating away from the store list.
- **FR-003**: The system MUST allow customers to browse a store's products organized by category, and switch between categories.
- **FR-004**: The system MUST support products that have zero or more optional add-ons, each with a distinct identity, name, and individual price. Each add-on is a binary selection (selected or unselected; quantity per add-on is capped at 1).
- **FR-005**: The system MUST allow customers to select any combination of a product's available add-ons (each at quantity 1) when adding it to the cart.
- **FR-006**: The system MUST treat cart entries with different add-on combinations as distinct items, even if they reference the same base product.
- **FR-007**: The system MUST enforce single-store cart integrity: adding a product from a second store MUST trigger a confirmation dialog before clearing the cart.
- **FR-008**: The system MUST allow customers to favorite and unfavorite individual stores. Both restaurants and markets share the same store favorites list.
- **FR-009**: The system MUST allow customers to favorite and unfavorite individual products.
- **FR-010**: The system MUST provide a Favorite Stores screen and a separate Favorite Products screen. The two lists are independent.
- **FR-011**: The system MUST display active promotional banners on the home screen.
- **FR-012**: Tapping a promotional banner MUST navigate the customer to a screen showing the promoted stores or products associated with that promotion.
- **FR-013**: The system MUST allow customers to enter at most one optional coupon code during checkout. Applying a new coupon code MUST replace any previously entered coupon code for that checkout session.
- **FR-014**: Coupon codes MUST be validated server-side. The client MUST display the result returned by the server (discount applied, or rejection with reason). The client MUST NOT determine or apply the discount unilaterally.
- **FR-015**: The system MUST allow customers to save multiple delivery addresses to their profile.
- **FR-016**: The system MUST allow customers to select a saved delivery address during checkout.
- **FR-017**: The selected delivery address MUST be recorded as an immutable snapshot on the placed order, independent of the customer's saved address records.
- **FR-018**: The checkout flow MUST proceed in the following order: (1) Review cart → (2) Choose delivery address → (3) Choose payment method → (4) Apply optional coupon → (5) Review server-validated total (items subtotal minus coupon discount; delivery fee is 0 in this foundation phase) → (6) Place order.
- **FR-019**: The system MUST support cash on delivery as the only payment method in the current scope. Online and card payment methods are deferred.
- **FR-020**: When the customer submits an order request, the server MUST create an immutable snapshot of each order item capturing: product name, product price at that moment, quantity, and each selected add-on's name and price at that moment.
- **FR-021**: Driver information for an active, driver-assigned order belonging to the authenticated customer MUST be limited to: driver name, driver photo, and driver phone number. Active fulfillment statuses eligible for driver info access are strictly: `accepted`, `preparing`, and `out_for_delivery`.
- **FR-022**: Access to driver information MUST be enforced server-side and scoped to the specific order. No driver information MUST be returned when the order does not belong to the requesting customer, has no driver assigned, or has transitioned to `delivered`, `cancelled`, or `rejected`.
- **FR-023**: Category navigation within a store is a presentation concern. No business logic MUST reside in category tab switching.
- **FR-024**: The system MUST prevent customers from adding products to the cart when the owning store is closed, and the server MUST reject order placement if the store is not open.

### Required Domain and Application Capabilities

The following capabilities must be supported by the domain and application layers of the system. How they are implemented at the infrastructure and database level is determined during planning.

- **CAP-001 Store Type**: The system must be able to represent and distinguish stores as either Restaurant or Market. Both types participate in the same purchasing model — no separate flows.
- **CAP-002 Product Categories**: The system must be able to represent categories within a store and associate products with their category.
- **CAP-003 Product Add-ons**: The system must be able to represent optional add-ons belonging to a product, each with its own identity, name, and price.
- **CAP-004 Composite Cart Item Identity**: The system must be able to identify cart items by the combination of product and the set of selected add-on IDs (order-independent). The same product with different add-on selections produces distinct cart items.
- **CAP-005 Store Favorites**: The system must support a customer favoriting and unfavoriting individual stores, and querying a customer's favorited stores.
- **CAP-006 Product Favorites**: The system must support a customer favoriting and unfavoriting individual products, and querying a customer's favorited products. Store and product favorites are independent.
- **CAP-007 Promotions**: The system must support active promotional offers that link to one or more stores or products, and allow the home screen to display them.
- **CAP-008 Coupon Validation**: The system must support a server-side coupon validation capability that receives the coupon code together with sufficient context (cart contents, store, customer, and any eligibility constraints) and returns the authoritative validation result and applicable discount. The client does not compute the discount.
- **CAP-009 Saved Delivery Addresses**: The system must support creating, updating, deleting, and listing a customer's saved delivery addresses. A saved address and an order's address snapshot are distinct — the snapshot is captured at order placement and is not a live reference to the saved address.
- **CAP-010 Order Placement with Server-Owned Snapshots**: The system must support placing an order where the server: validates store open status, retrieves canonical product and add-on data, validates product and add-on availability, validates coupon eligibility, computes authoritative prices and totals, creates immutable order-item snapshots and a delivery-address snapshot, and persists the order atomically.
- **CAP-011 Order-Scoped Driver Information**: The system must support retrieving the minimum driver information (name, photo, phone) for a specific order, subject to: the order belonging to the requesting customer, the order being in an active fulfillment state (`accepted`, `preparing`, `out_for_delivery`), and a driver being assigned. Access is revoked upon `delivered`, `cancelled`, or `rejected`. No other driver data is returned.
- **CAP-012 Add-to-Cart with Store Conflict Detection**: The system must support an add-to-cart operation that detects when the new item belongs to a different store than the current cart contents, and handles the conflict according to BR-002 and BR-010 — enforced in the application layer, not only in the UI.

### Key Entities

- **Store**: Represents a restaurant or a market. Key attributes: identity, name, type (restaurant or market), open/closed status, associated categories.
- **Category**: Organizes products within a store. Key attributes: identity, name, display order, owning store.
- **Product**: Belongs to a store and a category. Key attributes: identity, name, description, price, available add-ons. A product may have zero or more add-ons.
- **AddOn**: An optional modifier for a product. Key attributes: identity, name, price. An add-on is a binary toggle (either included or excluded; quantity per add-on is capped at 1).
- **CartItem**: Client-local representation of an item the customer intends to order. Identity = product identity + the unordered set of selected add-on identities. Attributes: store reference, product reference, selected add-ons, quantity. The cart may hold enough product/add-on information for display, but these values are not authoritative at order placement.
- **Promotion**: An active promotional offer displayed on the home screen. Key attributes: identity, promoted entity type (store or product), references to promoted entities, display metadata (image, title), active status.
- **CouponValidationResult**: The server's response to a coupon validation request. Contains: whether the coupon is valid and applicable, the discount amount (if applicable), and a rejection reason (if not applicable). This is not a stored entity — it is the result of a server-side operation.
- **DeliveryAddress (saved)**: A customer's reusable address record. Key attributes: identity, owning customer, label, address text.
- **DeliveryAddressSnapshot**: An immutable copy of the delivery address captured at order placement. Embedded in the order. Not a reference to the saved DeliveryAddress record.
- **Order**: A placed order. Key attributes: identity, owning customer, store reference, status, payment method (cash on delivery), coupon code used (at most one, nullable), discount amount, authoritative final total (server-computed), delivery address snapshot, placement timestamp.
- **OrderItemSnapshot**: An immutable record of one cart item as it existed at order placement. Key attributes: product reference (for traceability), product name at placement, product price at placement, quantity, item total, list of add-on snapshots.
- **AddOnSnapshot**: An immutable record of one selected add-on as it existed at order placement. Key attributes: add-on reference (for traceability), name at placement, price at placement (quantity is implicitly 1).
- **FavoriteStore**: Represents a customer's favorited store. Key attributes: customer reference, store reference.
- **FavoriteProduct**: Represents a customer's favorited product. Key attributes: customer reference, product reference.
- **OrderDriverInfo**: A read-only, order-scoped projection. Returned only when the order is in an active fulfillment state (`accepted`, `preparing`, `out_for_delivery`), driver-assigned, and owned by the requesting customer. Contains: driver name, driver photo URL, driver phone number. Access is revoked once the order reaches `delivered`, `cancelled`, or `rejected`. This is not a full driver record.

---

## State Ownership

Per Constitution Principle IV, state ownership is never duplicated.

| Data Domain                   | Owner                | Notes                                                              |
|------------------------------|----------------------|--------------------------------------------------------------------|
| Store list / store detail     | TanStack Query       | Server state                                                       |
| Product list / product detail | TanStack Query       | Server state                                                       |
| Category list                 | TanStack Query       | Server state, scoped to a store                                    |
| Add-on list                   | TanStack Query       | Server state, scoped to a product                                  |
| Cart contents                 | Redux Toolkit        | Client-local; business rule enforcement at application layer       |
| Favorite stores               | TanStack Query       | Server state; mutations trigger cache invalidation                 |
| Favorite products             | TanStack Query       | Server state; mutations trigger cache invalidation                 |
| Active promotions             | TanStack Query       | Server state, fetched on home screen load                          |
| Coupon validation result      | TanStack Query       | Server state, fetched when the customer submits a coupon code      |
| Saved delivery addresses      | TanStack Query       | Server state                                                       |
| Order list / order detail     | TanStack Query       | Server state; invalidated after order placement                    |
| Driver info (order-scoped)    | TanStack Query       | Server state; query scoped to a specific order identity            |
| Realtime order status         | TanStack Query cache | Updated by the OrderRealtimeService via cache write; not Redux     |

---

## Server-Authoritative Operations

The following operations MUST produce their authoritative result on the server. Client-computed values for these operations MUST NOT be persisted.

| Operation                             | What the Server Does                                                                 |
|--------------------------------------|--------------------------------------------------------------------------------------|
| Coupon validation                     | Determines eligibility based on code, cart contents, store, customer, and rules; returns the applicable discount amount or rejection reason |
| Order validation & total computation  | Validates store open status and product availability, retrieves canonical prices, applies validated discount, computes authoritative final total |
| Product and add-on snapshot creation  | Reads current canonical product and add-on data; creates immutable per-item snapshots at placement time |
| Delivery address snapshot creation    | Copies the selected address text into an immutable order-level snapshot               |
| Order persistence                     | Writes all snapshots and the order record atomically; enforces concurrency safety      |
| Driver info access control            | Returns driver name/photo/phone only when order ownership, assignment, and active fulfillment status (`accepted`, `preparing`, `out_for_delivery`) conditions are all satisfied; revokes access upon `delivered`, `cancelled`, or `rejected` |

---

## Domain Capabilities and Service Contracts

The following describes the required behavioral contracts at the domain and application boundary. Exact interface signatures, method names, and infrastructure implementations are determined during planning.

**Store capability**: Must support listing all stores, retrieving a store by identity, and filtering stores by type.

**Product capability**: Must support listing products by store, listing products by store and category, and retrieving a product by identity.

**Category capability**: Must support listing categories for a store.

**Add-on capability**: Must support listing add-ons for a product.

**Store Favorites capability**: Must support adding and removing a store from a customer's favorites, and listing a customer's favorite stores.

**Product Favorites capability**: Must support adding and removing a product from a customer's favorites, and listing a customer's favorite products.

**Promotions capability**: Must support retrieving currently active promotions.

**Coupon validation capability**: Must accept a coupon code together with sufficient context (at minimum: the cart's intended items and the customer identity) and return an authoritative validation result including whether the coupon applies, the discount amount, and a reason if rejected. Eligibility rules (minimum order value, store restrictions, customer eligibility, usage limits, expiry) are evaluated server-side.

**Saved Address capability**: Must support creating, updating, deleting, and listing a customer's saved delivery addresses.

**Order placement capability**: Must accept the customer's order request (store, products, quantities, add-on selections, chosen address, payment method, and optional coupon code), execute all server-side validations, compute the authoritative total, create all snapshots, and persist the order atomically.

**Order history capability**: Must support listing orders for a customer and retrieving a specific order by identity.

**Order-scoped driver information capability**: Must accept an order identity and the requesting customer's identity, verify ownership and eligibility conditions, and return only the driver's name, photo, and phone number when all conditions are met — or nothing otherwise.

**Order realtime capability**: Must support subscribing to status changes for a specific order without exposing the underlying realtime transport to use cases.

---

## Security and Authorization Boundaries

- All data access MUST be protected by server-enforced authorization. No data endpoint may rely solely on client-side checks.
- A customer MUST only be able to access their own orders, addresses, favorites, and cart operations.
- Driver information MUST only be returned when: the order belongs to the requesting customer, the order is in an active/eligible state, and a driver is assigned. These conditions MUST be enforced at the server level.
- Coupon redemption MUST be atomic. The check-and-mark operation MUST occur within a single transaction to prevent race conditions such as exceeding usage limits.
- Client-submitted prices, totals, or snapshot content MUST be ignored by the server. The server MUST derive all authoritative values from its own canonical data.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: The primary checkout flow (browse → add to cart → checkout → place order) contains no unnecessary steps and can be completed without leaving the flow.
- **SC-002**: Cart item identity is deterministic — the same product with the same add-on selection always produces the same cart entry regardless of the order add-ons were selected.
- **SC-003**: The single-store cart rule is deterministic — adding a product from a different store always triggers the conflict dialog in every tested case; silent cart replacement never occurs.
- **SC-004**: Server-authoritative pricing is enforced — the final order total persisted in the database always reflects the server-computed value (`items subtotal - coupon discount`), never a client-submitted value.
- **SC-005**: Historical order integrity is preserved — an existing order's item names, prices, and add-on details remain unchanged after the underlying product is modified, repriced, renamed, or deleted.
- **SC-006**: Delivery address immutability is preserved — an existing order's delivery address remains unchanged after the customer edits or deletes the corresponding saved address.
- **SC-007**: Driver information scope is enforced — only the driver's name, photo, and phone are accessible to the customer for a specific order in an active fulfillment state (`accepted`, `preparing`, `out_for_delivery`) with an assigned driver; access is revoked immediately upon `delivered`, `cancelled`, or `rejected`, and no additional driver data is returned in any tested scenario.
- **SC-008**: Coupon authority is enforced — the discount applied to any placed order always equals the server's computed discount; client-side coupon estimates are never persisted.

---

## Assumptions

- The Phase 1 Sari3 foundation includes customer authentication and basic store/product data models. Cart state exists but may use product-only identity and will need to be extended to composite identity.
- All customers in this feature scope are authenticated. Unauthenticated access to protected operations is already rejected by existing server-side authorization.
- Restaurant stores and Market stores share the same data model, purchasing model, and checkout path. No separate flows are built per store type.
- Cash on delivery requires no third-party payment integration. It is expressed as a payment method attribute on the order.
- Add-ons are flat and binary — a product has a single list of optional add-ons, each selectable at most once per item (no multi-quantity add-ons). Nested modifier groups (e.g., "choose one of: sauce A, sauce B") and multi-quantity add-ons are deferred to a future feature.
- Promotions are curated server-side. The customer app displays them; there is no self-serve promotion management in this scope.
- Coupon codes are single-coupon-per-order (no stacking). Code eligibility rules and usage limits are managed server-side; the client does not need to know the eligibility rules.
- Delivery addresses are stored as human-readable text. Geographic coordinates are not required for MVP. GPS-based features are deferred (Principle IX).
- A customer must have at least one saved address to complete checkout. There is no guest checkout or one-time address entry in this scope.
- Delivery fees are zero for this foundation phase (order total = items subtotal minus coupon discount). Store-level, zone-based, or distance-based delivery fee calculations are deferred (Principle IX).

---

## Deferred Capabilities

The following capabilities are intentionally deferred from the current feature scope. They are not permanently prohibited — they will be implemented later as separate features. Current architectural decisions MUST NOT prevent adding them without a rewrite (Principle IX).

| Capability                        | Status    | Notes                                                                             |
|----------------------------------|-----------|-----------------------------------------------------------------------------------|
| Driver live GPS tracking          | Deferred  | No map or location tracking in the current scope                                  |
| Driver location history           | Deferred  | No location data is captured or stored in the current scope                       |
| Dynamic / store delivery fees     | Deferred  | Delivery fee is zero in foundation phase; fee calculation models deferred to future phase |
| Online payments / card payments   | Deferred  | Architecture must remain extensible to add payment providers without rewriting order flow |
| Admin dashboard                   | Deferred  | Will be a separate capability with its own role and access model                  |
| Modifier groups (nested add-ons)  | Deferred  | Flat add-ons are sufficient for MVP                                               |
| Guest checkout                    | Deferred  | All ordering requires authentication in the current scope                         |
| Self-serve promotion management   | Deferred  | Promotions are operator-managed in the current scope                              |
| Customer order cancellation       | Deferred  | Post-placement cancellation is out of scope for this feature                      |
| Customer-initiated returns/refunds| Deferred  | Out of scope for this feature                                                     |
