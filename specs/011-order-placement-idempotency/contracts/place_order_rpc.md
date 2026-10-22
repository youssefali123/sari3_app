# Contract: `place_order` RPC

**Function**: `public.place_order(p_payload jsonb)`
**Security**: `SECURITY DEFINER`
**Access**: Granted to `authenticated` role; revoked from `public` and `anon`.

---

## 1. Request Payload Schema

```typescript
interface PlaceOrderPayload {
  idempotency_key: string;          // UUID, required
  store_id: string;                 // UUID, required
  delivery_address_id: string;      // UUID, required
  payment_method: 'cash_on_delivery';
  coupon_code?: string | null;      // Optional string
  items: {
    product_id: string;             // UUID, required
    variant_id?: string | null;     // UUID, required if product has variants
    quantity: number;               // Integer >= 1
    addon_ids: string[];            // Array of UUID strings
  }[];
}
```

---

## 2. Replay & Creation Semantics

### First Submission (New Idempotency Key)
1. Authenticates caller (`auth.uid()`) and verifies role is `customer`.
2. Validates `idempotency_key` is non-null and valid UUID.
3. Acquires transaction-scoped advisory lock: `pg_advisory_xact_lock(hashtext(v_customer_id::text), hashtext(v_idempotency_key::text))`.
4. Checks if order already exists for `(customer_id, idempotency_key)`.
5. If NOT found:
   - Validates store status (must be open).
   - Validates delivery address ownership.
   - Computes canonical prices, validates product & addon availability.
   - Validates & row-locks coupon, increments redemption counter.
   - Inserts order row with `idempotency_key`.
   - Inserts order items snapshots.
   - Inserts coupon redemption row if coupon applied.
   - Triggers fire: `enqueue_order_notification` (pending), `emit_driver_pool_signal` (order_added).
   - Returns serialized order confirmation.

### Subsequent Replay (Existing Idempotency Key)
1. Authenticates caller (`auth.uid()`) and verifies role is `customer`.
2. Validates `idempotency_key` format.
3. Acquires transaction-scoped advisory lock.
4. Checks if order already exists for `(customer_id, idempotency_key)`.
5. If FOUND:
   - Immediately serializes and returns the existing order record (including items).
   - Skips store hours checks, price calculations, and coupon updates.
   - No rows inserted or updated.
   - No notifications or pool signals emitted.

---

## 3. Error Responses

| Error String | SQLSTATE | Cause |
|---|---|---|
| `MISSING_IDEMPOTENCY_KEY` | `P0001` | `idempotency_key` is null, empty string, or not a valid UUID format |
| `AUTH_REQUIRED` | `P0001` | Caller has no active Supabase auth session |
| `ONLY_CUSTOMERS_CAN_PLACE_ORDERS` | `P0001` | Caller's profile role is not `customer` |
| `STORE_CLOSED` | `P0001` | Store is closed at initial order placement time |
| `ADDRESS_NOT_FOUND` | `P0001` | Address does not exist or does not belong to the caller |
| `PRODUCT_UNAVAILABLE` | `P0001` | One or more items in the cart are unavailable or price changed |
| `PRODUCT_VARIANT_REQUIRED` | `P0001` | Product has available variants but none was selected |
| `COUPON_INVALID` | `P0001` | Coupon code does not exist or is inactive |
| `COUPON_USAGE_LIMIT_REACHED` | `P0001` | Coupon maximum redemptions reached |

---

## 4. Success Response Payload (CamelCase Serialized Order)

```json
{
  "id": "e841e432-98e3-454f-8c23-ef0d2abb93c7",
  "customerId": "180e75f0-360c-4c2d-93ec-60690ad2fa26",
  "driverId": null,
  "storeId": "00000000-0000-0000-0000-000000000101",
  "storeName": "Koshary Abou Tarek",
  "status": "pending",
  "deliveryAddressSnapshot": "Apartment 4, 12 Tahrir Square, Cairo",
  "deliveryAddressLabel": "Home",
  "paymentMethod": "cash_on_delivery",
  "couponCode": "SAVE10",
  "discountAmount": 900,
  "subtotalAmount": 9000,
  "deliveryFee": 0,
  "totalAmount": 8100,
  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "createdAt": "2026-10-19T14:00:00Z",
  "acceptedAt": null,
  "deliveredAt": null,
  "updatedAt": "2026-10-19T14:00:00Z",
  "items": [
    {
      "id": "7b8f9e...",
      "orderId": "e841e432-98e3-454f-8c23-ef0d2abb93c7",
      "productId": "00000000-0000-0000-0000-000000001001",
      "productName": "Koshary Large",
      "variantName": null,
      "unitPrice": 4500,
      "quantity": 2,
      "subtotal": 9000,
      "addonSnapshots": []
    }
  ]
}
```
