# Quickstart & Validation Guide: Catalog and Checkout Foundation

**Feature**: Catalog and Checkout Foundation  
**Branch**: `001-catalog-checkout-foundation`  
**Date**: 2026-09-16  
**Status**: Completed

This guide provides end-to-end runnable validation scenarios to verify that the Catalog and Checkout Foundation feature complies with all functional requirements, business rules, and constitutional constraints.

---

## 1. Prerequisites & Setup

### 1.1 Environment
- Node.js >= 20
- Expo CLI (Expo SDK 57 / React Native 0.86)
- Local Supabase instance or remote development project with PostgreSQL 15+

### 1.2 Setup Commands
```bash
# Install dependencies
npm install

# Run type checks
npm run lint

# Start the development server
npx expo start
```

---

## 2. Validation Scenarios

### Scenario 1: Unified Catalog Browsing with Add-ons (User Story 1, FR-001–FR-005)

**Objective**: Verify restaurants and markets appear unified on the home screen, categories group products cleanly, and products support optional binary add-ons.

1. **Prerequisites**:
   - At least 1 Restaurant and 1 Market seeded in `restaurants` table with `is_open = true`.
   - At least 2 categories in `store_categories` and 3 products in `products`.
   - At least 2 add-ons linked to a product in `product_add_ons`.
2. **Execution**:
   - Open home screen `/(customer)/(home)/index`.
   - Verify both restaurant and market cards are rendered with distinct type badges.
   - Tap into a store. Verify category tabs filter products accordingly.
   - Open a product with add-ons. Toggle add-on checkboxes.
3. **Expected Outcome**:
   - Stores are distinguished visually without leaving the list (FR-002).
   - Add-on selection is strictly binary (quantity capped at 1 per add-on, BR-003).

---

### Scenario 2: Single-Store Cart & Composite Item Identity (User Story 2, BR-002, BR-003, BR-010)

**Objective**: Validate composite cart keys and deterministic conflict prompt handling.

1. **Test Steps**:
   - Add Product A with `[Addon 1, Addon 2]` (quantity: 1).
   - Add Product A with `[Addon 2, Addon 1]` (quantity: 1).
   - Verify cart displays **one** line item for Product A with quantity = 2 (order-independent identity, BR-003).
   - Add Product A with `[Addon 1]` only (quantity: 1).
   - Verify cart now contains **two distinct line items** (BR-003, SC-002).
   - Navigate to Store B and attempt to add Product B to the cart.
2. **Conflict Resolution Validation**:
   - Verify confirmation modal appears asking: *"Replace cart items from Store A with Store B?"* (No silent replacement, SC-003).
   - Tap "Cancel". Verify cart still contains Store A items.
   - Tap "Add" again and tap "Confirm". Verify cart is cleared and now contains only Product B.

---

### Scenario 3: Saved Delivery Addresses (User Story 5, FR-015, FR-016)

**Objective**: Verify multiple addresses can be saved and selected at checkout.

1. **Test Steps**:
   - Navigate to Profile -> Addresses.
   - Create two addresses: `"Home"` and `"Work"`.
   - Proceed to Checkout screen `/(customer)/cart`.
   - Tap "Select Address".
2. **Expected Outcome**:
   - Both saved addresses appear in selection modal.
   - Selected address is populated into the checkout order request payload.

---

### Scenario 4: Server-Authoritative Pricing, Coupon Validation, & Snapshots (User Story 1, User Story 4, BR-004–BR-007)

**Objective**: Verify server recomputes prices, validates coupons, computes final total, and captures immutable snapshots.

1. **Test Steps**:
   - Add items totaling 200.00 EGP to cart.
   - In checkout, apply coupon `"SAVE10"` (10% discount).
   - Observe validation response from `validate_coupon` RPC: 20.00 EGP discount applied.
   - Apply a different coupon `"SAVE20"` (20% discount).
   - Verify `"SAVE20"` replaces `"SAVE10"` (single-coupon enforcement, BR-004).
   - Submit order via `place_order` RPC with `payment_method = 'cash_on_delivery'`.
2. **Database Verification**:
   - Inspect newly created row in `orders`:
     - `total_amount` equals `16000` piasters (160.00 EGP), server-computed.
     - `delivery_fee` equals `0` piasters.
     - `delivery_address` contains full snapshot text.
   - Inspect rows in `order_items`:
     - `product_name` and `unit_price` are populated from catalog snapshot.
     - `addon_snapshots` contains JSONB array with snapshot name and prices.
3. **Immutability Check (SC-005, SC-006)**:
   - In the database, change product price in `products` table.
   - In the database, edit or delete the customer's address in `saved_addresses`.
   - Retrieve order detail via `getOrderById`.
   - **Expected Outcome**: Order detail still displays original purchase price, add-on prices, and delivery address.

---

### Scenario 5: Closed Store Ordering Block (BR-001, FR-024)

**Objective**: Verify catalog can be browsed when store is closed, but adding to cart or submitting orders is rejected.

1. **Test Steps**:
   - Set store `is_open = false` in `restaurants` table.
   - Browse store catalog: verify products are visible.
   - Verify "Add to Cart" button is disabled in the UI.
   - Attempt to directly invoke `place_order` RPC with this store's ID.
2. **Expected Outcome**:
   - RPC throws exception `STORE_CLOSED` and order is not created.

---

### Scenario 6: Scoped Driver Privacy & Lifecycle Revocation (User Story 6, BR-008, FR-021, FR-022)

**Objective**: Verify driver contact details are visible only for active orders and revoked upon delivery.

1. **Test Steps**:
   - Place an order (status = `'pending'`).
   - Query `get_order_driver_info(order_id)`. Verify response is `null`.
   - Assign a driver to the order and update status to `'assigned'`.
   - Query `get_order_driver_info(order_id)`. Verify response contains:
     - `driver_name`
     - `driver_photo_url`
     - `driver_phone`
     - **No** vehicle details, license plate, location history, or full user profile.
   - Update order status to `'delivered'`.
   - Re-query `get_order_driver_info(order_id)`.
2. **Expected Outcome**:
   - Response returns `null` immediately upon reaching terminal state (FR-022, SC-007).

---

### Scenario 7: Store & Product Favorites (User Story 3, FR-008–FR-010)

**Objective**: Verify store and product favorites operate independently.

1. **Test Steps**:
   - Tap favorite heart icon on a Store.
   - Tap favorite heart icon on a Product.
   - Navigate to Favorite Stores screen: verify only the favorited store appears.
   - Navigate to Favorite Products screen: verify only the favorited product appears.
   - Unfavorite the store: verify store disappears from Favorite Stores, while Favorite Products is untouched.
