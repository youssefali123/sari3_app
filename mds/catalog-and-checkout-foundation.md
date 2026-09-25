Extend the existing Sari3 customer ordering experience specification.

IMPORTANT:
- Read and strictly follow the existing constitution.md.
- The constitution is authoritative and must not be changed by this feature.
- This is an extension of the existing Sari3 project and Phase 1 foundation.
- Do not redesign or replace the existing architecture.
- Reuse existing Phase 1 concepts and abstractions wherever possible.
- Do not implement the entire feature at this stage.
- Produce the feature specification and identify the Phase 1 foundation changes required to support it.
- Clearly distinguish Phase 1 foundation work from implementation work belonging to later phases.

## Feature: Customer Ordering Experience Extension

Extend the customer ordering experience with the following requirements:

### 1. Store Types

Stores can be either:
- Restaurant
- Market

Customers browse both from the same home screen.

Restaurant and Market must use the same purchasing model and ordering flow. They may be visually distinguished, but they must not become separate purchasing architectures.

---

### 2. Store Categories

Each store organizes products into categories.

Examples:
- Burgers
- Drinks
- Pizza
- Desserts
- Snacks

Customers browsing a store can:
- view category tabs
- switch between categories
- see products grouped under their category

Category navigation is a presentation concern and must not contain business logic.

---

### 3. Product Add-ons

Products may have optional add-ons.

Each add-on has:
- stable identity
- name
- individual price

Customers can select any combination of available add-ons.

Different add-on selections MUST produce distinct cart entries.

For example:

Product A
Product A + Extra Cheese
Product A + Extra Cheese + Extra Sauce

are different cart entries even though they reference the same base product.

The cart item identity must therefore account for:
- product
- selected add-ons

---

### 4. Favorites

Customers can independently favorite:
- restaurants
- products

Customers must be able to browse:
- favorite restaurants
- favorite products

as separate lists.

---

### 5. Promotions and Coupons

The home screen displays active promotional offers.

An offer may promote:
- restaurants
- products

Selecting an offer opens a page showing the promoted restaurants/products.

Coupons are separate from promotional offers.

Customers may optionally enter a coupon code during checkout.

Coupon validity, eligibility, discount amount, and final discount MUST be authoritative on the server/database.

Client-side coupon validation is only a UX convenience and must never be trusted for order persistence.

---

### 6. Saved Delivery Addresses

Customers can save multiple delivery addresses.

At checkout, the customer selects one saved address.

Editing or deleting a saved address MUST NOT modify the address recorded on an existing/past order.

The order must contain an immutable delivery-address snapshot captured when the order is placed.

---

### 7. Single-Store Cart

A cart can contain products from only one store at a time.

If a customer attempts to add a product from another store:

1. Detect the store conflict.
2. Ask the customer for confirmation.
3. If confirmed, clear the existing cart and add the new product.
4. If declined, keep the existing cart unchanged.

This is a business rule and must not exist only in the UI.

---

### 8. Checkout Flow

Checkout is a distinct flow:

1. Review cart
2. Choose delivery address
3. Choose payment method
4. Apply optional coupon
5. Review final total
6. Place order

Payment method supported by this feature:
- Cash on Delivery only

Do not implement online/card payments.

The client may display an estimated total, but the authoritative product prices, add-on prices, coupon discount, and final order total must be validated server-side before the order is persisted.

---

### 9. Immutable Order Items

Once an order is placed, its recorded items must remain historically accurate.

Each order item must preserve the required purchase-time information, including:

- product name
- product price
- quantity
- selected add-ons
- add-on names
- add-on prices
- item total where required by the domain

Changing, repricing, renaming, or deleting the original product must never change an existing order.

Order history must use immutable snapshots rather than relying only on mutable product references.

---

### 10. Limited Driver Information

When a customer has an active order with an assigned driver, the customer may access only the following information for that specific order:

- driver name
- driver photo
- driver phone

The customer must NOT receive:
- the driver's complete profile
- unrelated driver information
- information about other drivers

Access must be order-scoped and enforced server-side according to the existing constitution.

---

## Explicitly Out of Scope

Do not implement or introduce requirements for:

- Driver live GPS tracking
- Driver map tracking
- Online payments
- Card payments
- Admin role
- Admin dashboard
- Driver location history

Architecture may remain extensible for these capabilities according to Principle IX of the constitution, but they must not be implemented as part of this feature.

## Specification Expectations

The resulting specification must clearly describe:

1. Functional requirements
2. Business rules
3. Domain concepts/entities affected
4. Use cases affected
5. State ownership according to the constitution
6. Repository/service contracts required
7. Server-authoritative operations
8. Historical snapshot requirements
9. Security and authorization boundaries
10. Phase 1 foundation changes required
11. Capabilities intentionally deferred to later phases

Do not invent unnecessary abstractions.

Follow Principle X and keep the design understandable for a junior/mid-level developer.

Do not modify constitution.md.
