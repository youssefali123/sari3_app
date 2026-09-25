# Database RPC Contracts: Catalog and Checkout Foundation

**Feature**: Catalog and Checkout Foundation  
**Branch**: `001-catalog-checkout-foundation`  
**Date**: 2026-09-16  
**Status**: Completed

These stored procedures run inside Supabase Postgres as `SECURITY DEFINER` functions, enforcing Constitution Principle V (Server Authority), Principle VI (Atomic Concurrency-Critical Writes), and Principle VII (Immutable Snapshots).

---

## 1. `place_order` RPC

### Purpose
Atomically validates the order, verifies store open status, fetches canonical catalog prices, validates and redeems a single coupon (if provided), creates immutable address and item snapshots, calculates the authoritative total (`final_total = items_subtotal - coupon_discount`), and persists the order.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.place_order(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Request Payload (`p_payload JSONB`)
```json
{
  "store_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "delivery_address_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "payment_method": "cash_on_delivery",
  "coupon_code": "SAVE10",
  "items": [
    {
      "product_id": "b1a51189-9b93-4e89-8d1a-8e2b83ef3c09",
      "quantity": 2,
      "addon_ids": [
        "c2d61189-9b93-4e89-8d1a-8e2b83ef3c11",
        "d3e71189-9b93-4e89-8d1a-8e2b83ef3c22"
      ]
    },
    {
      "product_id": "b1a51189-9b93-4e89-8d1a-8e2b83ef3c09",
      "quantity": 1,
      "addon_ids": []
    }
  ]
}
```

### Server Validation & Processing Steps
1. **Authentication Check**: Verify `auth.uid() IS NOT NULL`. Assign `v_customer_id := auth.uid()`.
2. **Store Validation**:
   - Query `restaurants` by `id = p_payload->>'store_id'`.
   - Verify store exists. If not, raise exception `STORE_NOT_FOUND`.
   - Verify `is_open = true` (BR-001, FR-024). If closed, raise exception `STORE_CLOSED`.
   - Capture `v_store_name := restaurants.name`.
3. **Delivery Address Validation & Snapshotting**:
   - Query `saved_addresses` by `id = p_payload->>'delivery_address_id'` AND `customer_id = v_customer_id`.
   - Verify address exists and belongs to customer. If not, raise exception `ADDRESS_NOT_FOUND`.
   - Capture immutable snapshots: `v_address_text := saved_addresses.address_text`, `v_address_label := saved_addresses.label`.
4. **Items & Add-Ons Canonical Validation**:
   - Initialize `v_subtotal := 0`.
   - For each item in `p_payload->'items'`:
     - Validate `quantity >= 1`.
     - Query canonical `products` by `id = item.product_id` AND `restaurant_id = p_payload->>'store_id'`.
     - Verify product exists and `is_available = true`. If not, raise exception `PRODUCT_UNAVAILABLE`.
     - Capture `v_prod_name := products.name`, `v_prod_price := products.price`.
     - Initialize `v_item_addons_json := '[]'::jsonb`.
     - Initialize `v_addon_subtotal := 0`.
     - For each `addon_id` in `item.addon_ids`:
       - Query canonical `product_add_ons` by `id = addon_id` AND `product_id = item.product_id`.
       - Verify add-on exists and `is_available = true`. If not, raise exception `ADDON_UNAVAILABLE`.
       - Add to `v_item_addons_json`: `jsonb_build_object('addon_id', add_on.id, 'name', add_on.name, 'price', add_on.price)`.
       - `v_addon_subtotal := v_addon_subtotal + add_on.price`.
     - Compute line item subtotal: `v_line_subtotal := (v_prod_price + v_addon_subtotal) * item.quantity`.
     - `v_subtotal := v_subtotal + v_line_subtotal`.
5. **Coupon Validation & Redemption (BR-004, BR-009)**:
   - Initialize `v_discount := 0`.
   - If `p_payload->>'coupon_code'` is non-empty:
     - Query `coupons` where `code = UPPER(TRIM(p_payload->>'coupon_code'))` FOR UPDATE.
     - If not found or `is_active = false`, raise exception `COUPON_INVALID`.
     - Check `now() BETWEEN starts_at AND COALESCE(expires_at, '9999-12-31'::timestamptz)`. If expired, raise exception `COUPON_EXPIRED`.
     - Check `store_id IS NULL OR store_id = (p_payload->>'store_id')::uuid`. If mismatch, raise exception `COUPON_STORE_RESTRICTED`.
     - Check `min_order_amount IS NULL OR v_subtotal >= min_order_amount`. If not met, raise exception `COUPON_MIN_ORDER_NOT_MET`.
     - Check `max_redemptions IS NULL OR current_redemptions < max_redemptions`. If limit reached, raise exception `COUPON_USAGE_LIMIT_REACHED`.
     - Compute discount:
       - If `discount_type = 'fixed_amount'`: `v_discount := LEAST(discount_value, v_subtotal)`.
       - If `discount_type = 'percentage'`: `v_discount := (v_subtotal * discount_value) / 100`.
         - If `max_discount_amount` is set: `v_discount := LEAST(v_discount, max_discount_amount)`.
     - Increment `current_redemptions := current_redemptions + 1`.
6. **Order Totals Calculation**:
   - `v_delivery_fee := 0` (zero delivery fee in foundation phase, BR-005).
   - `v_final_total := v_subtotal - v_discount + v_delivery_fee`.
7. **Database Insertion (Atomic Snapshot Persistence)**:
   - Insert into `public.orders`:
     ```sql
     INSERT INTO public.orders (
       customer_id, restaurant_id, restaurant_name, status,
       delivery_address, delivery_address_label, payment_method,
       coupon_code, discount_amount, subtotal_amount, delivery_fee, total_amount
     ) VALUES (
       v_customer_id, (p_payload->>'store_id')::uuid, v_store_name, 'pending',
       v_address_text, v_address_label, 'cash_on_delivery',
       p_payload->>'coupon_code', v_discount, v_subtotal, v_delivery_fee, v_final_total
     ) RETURNING id INTO v_order_id;
     ```
   - For each item:
     ```sql
     INSERT INTO public.order_items (
       order_id, product_id, product_name, quantity, unit_price,
       addon_snapshots, subtotal
     ) VALUES (
       v_order_id, item.product_id, v_prod_name, item.quantity, v_prod_price,
       v_item_addons_json, v_line_subtotal
     );
     ```
   - If coupon used:
     ```sql
     INSERT INTO public.coupon_redemptions (
       coupon_id, order_id, customer_id, discount_amount
     ) VALUES (v_coupon_id, v_order_id, v_customer_id, v_discount);
     ```
8. **Return Value**:
   - Return serialized order with items as JSONB matching the `Order` TypeScript interface.

### Error Codes
| Code | HTTP / RPC Exception | Rationale |
|---|---|---|
| `AUTH_REQUIRED` | 401 Unauthorized | Caller is unauthenticated |
| `STORE_NOT_FOUND` | 404 Not Found | Store does not exist |
| `STORE_CLOSED` | 400 Bad Request | Store is closed for ordering (BR-001, FR-024) |
| `ADDRESS_NOT_FOUND` | 400 Bad Request | Delivery address does not belong to user |
| `PRODUCT_UNAVAILABLE` | 400 Bad Request | Product out of stock / disabled |
| `ADDON_UNAVAILABLE` | 400 Bad Request | Add-on no longer available |
| `COUPON_INVALID` | 400 Bad Request | Coupon does not exist or inactive |
| `COUPON_EXPIRED` | 400 Bad Request | Coupon past expiration date |
| `COUPON_STORE_RESTRICTED` | 400 Bad Request | Coupon not valid for this store |
| `COUPON_MIN_ORDER_NOT_MET` | 400 Bad Request | Subtotal below coupon threshold |
| `COUPON_USAGE_LIMIT_REACHED` | 400 Bad Request | Coupon max redemptions exceeded |

---

## 2. `validate_coupon` RPC

### Purpose
Read-only server validation of a coupon code against candidate cart contents, returning the authoritative discount amount and eligibility status. Does not consume/redeem the coupon.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_store_id UUID,
  p_items JSONB,
  p_customer_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Request Parameters
- `p_code`: e.g., `"SAVE10"`
- `p_store_id`: UUID of the store
- `p_items`: Array of `{ product_id: UUID, quantity: INTEGER, addon_ids: UUID[] }`
- `p_customer_id`: Defaults to `auth.uid()`

### Response (`JSONB`)
```json
// Success response
{
  "is_valid": true,
  "discount_amount": 750,
  "discount_type": "percentage",
  "rejection_reason": null
}

// Rejection response
{
  "is_valid": false,
  "discount_amount": 0,
  "discount_type": null,
  "rejection_reason": "Order minimum of 50.00 EGP not met"
}
```

---

## 3. `get_order_driver_info` RPC

### Purpose
Exposes strictly the driver's name, photo, and phone number for a customer's active order (BR-008, FR-021, FR-022). Access is revoked automatically upon `delivered`, `cancelled`, or `rejected`.

### Signature
```sql
CREATE OR REPLACE FUNCTION public.get_order_driver_info(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp;
```

### Authorization & Visibility Rules
1. Order must belong to calling user: `orders.customer_id = auth.uid()`.
2. Driver must be assigned: `orders.driver_id IS NOT NULL`.
3. Order status must be in an active delivery state:
   `orders.status IN ('accepted', 'preparing', 'out_for_delivery')`.
4. If status is `delivered`, `cancelled`, or `rejected`, return `NULL`.
5. If conditions are met, join `profiles` on `profiles.id = orders.driver_id` and return:
   ```json
   {
     "order_id": "8d3c563e-5b32-4752-9d33-4f9fa5f190bc",
     "driver_name": "Ahmed Hassan",
     "driver_photo_url": "https://...",
     "driver_phone": "+201001234567"
   }
   ```
6. Full driver record, vehicle details, license plate, other orders, or location history are NEVER exposed.
