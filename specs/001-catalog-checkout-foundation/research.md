# Research & Architectural Decisions: Catalog and Checkout Foundation

**Feature**: Catalog and Checkout Foundation  
**Branch**: `001-catalog-checkout-foundation`  
**Date**: 2026-09-16  
**Status**: Completed

---

## 1. Database Representation of Immutable Order Snapshots

### Context
Constitution Principle VII (Historical Records Are Immutable Snapshots) and requirements BR-006, BR-007, FR-017, and FR-020 mandate that placed orders must preserve historical accuracy. Modifying, repricing, renaming, or deleting a product, add-on, or saved address must never alter existing orders. Furthermore, User Story 1 (Scenario 4) specifies that the same product added with different add-on selections forms distinct items.

### Decision
Use relational rows in `orders` and `order_items`, with embedded immutable snapshot fields:
- **Delivery Address Snapshot**: Stored as snapshot columns (`delivery_address_text`, `delivery_address_label`) on the `orders` table. This is captured at order placement time from the customer's selected saved address, with no foreign key dependency on `saved_addresses.id`. If the customer later alters or deletes their saved address, historical orders remain unaffected.
- **Store Name Snapshot**: Stored as `store_name` on `orders` so historical orders retain the store name at the time of purchase.
- **Order Items**: Stored in `order_items` table with snapshot columns (`product_id` for reference, `product_name`, `unit_price`, `quantity`, `subtotal`).
- **Add-on Snapshots**: Stored as an immutable JSONB array `addon_snapshots` on each `order_items` row:
  ```json
  [
    {
      "addon_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "name": "Extra Cheese",
      "price": 500
    }
  ]
  ```
- **Order Item Uniqueness**: Remove the legacy Phase 1 constraint `order_items_product_once_per_order unique (order_id, product_id)`. Each row in `order_items` has its own unique primary key `id: uuid`, allowing the same base product with different add-on combinations (or distinct order item lines) to exist within the same order.

### Rationale
- Embedding add-on snapshots as JSONB directly in `order_items` eliminates the need for cascading deletes or complex join tables that could break when catalog items are deleted or modified.
- Address snapshot on `orders` ensures that deleting or editing a user address record has zero impact on past orders.
- Complies with Principle VII (Historical Records Are Immutable Snapshots) and Principle X (MVP Simplicity).

### Alternatives Considered
- *Full JSONB blob for entire order*: Harder to index, query for order reporting, and perform relational analytics.
- *Relational `order_item_addons` child table with snapshot columns*: Adds unnecessary schema complexity and joins for simple, flat binary add-ons.

---

## 2. Server-Authoritative Order Placement & Atomic Persistence

### Context
Constitution Principle V (Server Authority), Principle VI (Atomic Concurrency-Critical Writes), and requirements BR-004, BR-005, and BR-009 require that prices, discounts, availability, store open status, and order totals are validated and computed on the database server before order persistence. Client-submitted prices or totals must never be trusted.

### Decision
Implement a Postgres `SECURITY DEFINER` function `place_order(p_payload JSONB)` that executes within a single atomic transaction:
1. Validates that the authenticated customer (`auth.uid()`) owns the request.
2. Checks that the target store exists and is currently open (`is_open = true`) (BR-001, FR-024). Rejects if closed.
3. Iterates over requested items and fetches canonical product prices and availability from `products` where `is_available = true`. Rejects if unavailable.
4. For each selected add-on, verifies existence and fetches canonical unit price from `product_add_ons` where `is_available = true`.
5. If a coupon code is provided:
   - Queries `coupons` where `code = UPPER(TRIM(p_coupon_code))` and `is_active = true`.
   - Validates coupon start/end dates, store restriction (if store-scoped), and minimum order threshold.
   - Computes authoritative discount (`percentage` with optional max cap, or `fixed_amount`).
   - Checks `current_redemptions < max_redemptions` (if max specified) and atomically increments `current_redemptions`.
   - Inserts record into `coupon_redemptions`.
6. Calculates authoritative order subtotal, discount, and final total:
   `final_total = item_subtotal - coupon_discount` (delivery fee is 0 in this foundation phase).
7. Creates immutable delivery address snapshot and item snapshots.
8. Inserts the order row (`orders`) and item rows (`order_items`).
9. Returns the created `Order` object with its items.

### Rationale
- Completely prevents client-side price tampering or coupon spoofing.
- Ensures atomic write: if a store closes or coupon limit is reached during checkout submission, the transaction rolls back cleanly with a descriptive error.
- Complies with Principles V, VI, and VII.

### Alternatives Considered
- *Client-side multi-step RPC calls (validate coupon -> create order -> insert items)*: Highly vulnerable to race conditions, partial writes, and network disconnects between steps.

---

## 3. Order-Scoped Driver Information Security & Privacy

### Context
Constitution Principle V, requirements BR-008, FR-021, FR-022, and Clarification Q1 mandate that customer access to driver contact details is restricted strictly to an active, driver-assigned order and revoked upon delivery, cancellation, or rejection.
The allowed fulfillment statuses are strictly: `accepted`, `preparing`, and `out_for_delivery`.

### Decision
Implement access control via a dedicated database function `get_order_driver_info(p_order_id UUID)`:
- Verifies `orders.customer_id = auth.uid()`.
- Verifies `orders.status IN ('accepted', 'preparing', 'out_for_delivery')`.
- Verifies `orders.driver_id IS NOT NULL`.
- Joins `driver_profiles` and `profiles` to select strictly `full_name AS driver_name`, `avatar_url AS driver_photo_url`, and `phone AS driver_phone`.
- Returns `NULL` (or raises access denied) if any condition is not met (e.g. order is `delivered`, `cancelled`, or belongs to another user).

### Rationale
- Guarantees driver privacy at the database layer (Principle V).
- Driver's full profile, license plate, vehicle details, location history, and other orders are never exposed to the client.
- Automatically revokes access as soon as order status transitions to `delivered` or `cancelled`.

### Alternatives Considered
- *Exposing driver ID on order and letting client query driver profile with RLS*: Leaks driver ID and increases risk of over-fetching driver profile fields or bypassing order status checks.

---

## 4. Composite Cart Item Identity & Store Conflict Handling

### Context
Requirements BR-002, BR-003, BR-010, FR-006, FR-007, and Clarifications Q2 & Q3 specify:
- Add-ons are binary selections (max 1 per add-on).
- Add-on selection order must not affect identity (`[A, B]` == `[B, A]`).
- Cart items with distinct add-on combinations are separate cart entries.
- Single-store cart rule: adding an item from a different store prompts for confirmation in the Application layer before clearing.

### Decision
1. **Deterministic Cart Key**:
   ```typescript
   export function generateCartItemId(productId: string, addonIds: string[]): string {
     const sortedIds = [...addonIds].sort();
     return `${productId}::${sortedIds.join(',')}`;
   }
   ```
2. **Store Conflict Handling in Application Layer**:
   The single-store cart rule is encapsulated in a dedicated application-layer action / use case `addItemWithStoreCheck`:
   - If `cart.storeId === null` or `cart.storeId === incomingStoreId`: dispatch `addItem` directly.
   - If `cart.storeId !== incomingStoreId`: the application layer flags a conflict state (`conflictModal = { pendingItem, pendingStoreId }`).
   - If user confirms: dispatch `clearAndAddItem({ item, storeId })`.
   - If user declines: dispatch `dismissConflict()`.
   Silent cart replacement is strictly prohibited (SC-003).

### Rationale
- Enforces business logic in the Application layer rather than spreading it across React Native components (Principle II, BR-010).
- Deterministic key ensures consistent cart item matching regardless of tap sequence.

---

## 5. Coupon Validation Conceptual Contract

### Context
Requirement BR-004, FR-013, FR-014, and CAP-008 define a server-authoritative coupon check:
`validate(code, storeId, items, customerId) -> CouponValidationResult`

### Decision
- **Client/Domain Interface**:
  ```typescript
  export interface CouponValidationContext {
    code: string;
    storeId: string;
    items: Array<{ productId: string; quantity: number; addonIds: string[] }>;
    customerId: string;
  }

  export interface CouponValidationResult {
    isValid: boolean;
    discountAmount: number; // in piasters
    discountType: 'percentage' | 'fixed_amount' | null;
    rejectionReason: string | null;
  }
  ```
- **Infrastructure Implementation**:
  Calls Supabase RPC `validate_coupon(p_code, p_store_id, p_items, p_customer_id)`.
- Strictly single-coupon: applying a new coupon replaces any existing coupon in checkout state.
- Zero client calculation: the client only renders the discount amount returned by the server.

### Rationale
- Keeps validation authoritative on the server (Principle V).
- Eliminates discrepancies between client estimate and final persisted total.

---

## 6. Favorites Architecture (Store and Product)

### Context
Requirements BR-008, FR-008, FR-009, FR-010:
- Stores (both restaurants and markets) and products can be independently favorited.
- Favorites lists are separate screens and queries.
- Owned by TanStack Query (Principle IV).

### Decision
- **Database Tables**:
  - `favorite_stores (customer_id UUID, store_id UUID, created_at TIMESTAMPTZ, PRIMARY KEY(customer_id, store_id))`
  - `favorite_products (customer_id UUID, product_id UUID, created_at TIMESTAMPTZ, PRIMARY KEY(customer_id, product_id))`
- **RLS**: Customer can only select, insert, and delete rows where `customer_id = auth.uid()`.
- **Query Keys**: `['favorites', 'stores', customerId]` and `['favorites', 'products', customerId]`.
- Mutations update the server and invalidate the respective query keys.

---

## 7. Unified Store Model (Restaurant & Market)

### Context
Requirements BR-001, FR-001, FR-002, and CAP-001:
- Stores can be Restaurant or Market.
- Both share the exact same purchasing model and ordering architecture.

### Decision
- Maintain backward compatibility with the Phase 1 schema while unifying naming:
  The `restaurants` table in Postgres is extended with `store_type: 'restaurant' | 'market'` (or aliased as `stores`).
- Domain entity `Store` in `src/features/restaurants/domain/entities/Store.ts` (aliasing `Restaurant`):
  ```typescript
  export type StoreType = 'restaurant' | 'market';

  export interface Store {
    id: string;
    name: string;
    type: StoreType;
    description: string | null;
    imageUrl: string | null;
    address: string;
    rating: number | null;
    isOpen: boolean;
    createdAt: string;
  }
  ```
- Categories (`store_categories`) and products reference `store_id` (foreign key to `restaurants(id)`).

---

## 8. State Ownership Matrix Summary

| Data Domain | Storage / Owner | Mechanism | Constitutional Rule |
|---|---|---|---|
| Stores, Products, Categories | TanStack Query | Cached fetch via Supabase | Principle IV |
| Favorites (Store, Product) | TanStack Query | Invalidation on mutation | Principle IV |
| Active Promotions | TanStack Query | Query key `['promotions']` | Principle IV |
| Coupon Validation Result | TanStack Query | Cached query on code submission | Principle IV |
| Saved Addresses | TanStack Query | Query key `['addresses']` | Principle IV |
| Order History & Detail | TanStack Query | Invalidation on place_order | Principle IV |
| Order-Scoped Driver Info | TanStack Query | Query key `['order-driver', orderId]` | Principle IV & BR-008 |
| Realtime Order Status | TanStack Query cache | `setQueryData` from realtime service | Principle IV & VIII |
| Cart State & Selections | Redux Toolkit | Local client slice | Principle IV |
