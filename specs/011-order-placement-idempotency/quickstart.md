# Quickstart & Verification Guide: Order Placement Idempotency

**Feature**: `011-order-placement-idempotency`
**Date**: 2026-10-19

This guide describes how to validate the idempotency and duplicate order prevention capabilities across the live database and client application.

---

## Prerequisites

1. Live Supabase database connection (`ciznkxtwyrocgiwyapyj`).
2. Test Customer account: ID `180e75f0-360c-4c2d-93ec-60690ad2fa26`.
3. Open store with available products and active coupon (e.g. store `00000000-0000-0000-0000-000000000101`, product `00000000-0000-0000-0000-000000001001`, coupon `SAVE10`).
4. Local dev environment running Expo (`npm run dev` or Jest unit test suite).

---

## Verification Scenarios

### Scenario 1: Sequential Replay & Coupon Preservation (Live Database, Rolled Back)
**Goal**: Verify that calling `place_order` twice sequentially with the same `idempotency_key` creates exactly 1 order and consumes 1 coupon redemption.

**Execution**:
Run inside an uncommitted transaction in `psql` or SQL editor:
```sql
DO $$
DECLARE
  v_payload jsonb := '{
    "idempotency_key": "11111111-1111-1111-1111-111111111111",
    "store_id": "00000000-0000-0000-0000-000000000101",
    "delivery_address_id": "ce93b128-e398-4599-b540-3621b55a8e76",
    "payment_method": "cash_on_delivery",
    "coupon_code": "SAVE10",
    "items": [{"product_id": "00000000-0000-0000-0000-000000001001", "quantity": 2, "addon_ids": []}]
  }'::jsonb;
  v_res1 jsonb;
  v_res2 jsonb;
  v_order_count int;
  v_coupon_redemptions int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '180e75f0-360c-4c2d-93ec-60690ad2fa26', true);
  
  v_res1 := public.place_order(v_payload);
  v_res2 := public.place_order(v_payload);

  SELECT count(*) INTO v_order_count FROM public.orders 
  WHERE customer_id = '180e75f0-360c-4c2d-93ec-60690ad2fa26'
    AND idempotency_key = '11111111-1111-1111-1111-111111111111'::uuid;

  SELECT count(*) INTO v_coupon_redemptions FROM public.coupon_redemptions
  WHERE customer_id = '180e75f0-360c-4c2d-93ec-60690ad2fa26'
    AND coupon_id = '943b737b-9440-421c-8222-8739b0e0738b';

  ASSERT v_res1->>'id' = v_res2->>'id', 'Returned order IDs must match';
  ASSERT v_order_count = 1, 'Exactly one order must be recorded';
  ASSERT v_coupon_redemptions = 1, 'Exactly one coupon redemption must be counted';

  RAISE EXCEPTION 'TEST_PASSED_ROLLBACK';
END $$;
```
**Expected Outcome**: Transaction aborts with `TEST_PASSED_ROLLBACK`. Order count is 1, coupon redemption count is 1.

---

### Scenario 2: Rejection of Missing/Malformed Idempotency Key
**Goal**: Verify that calling `place_order` without an `idempotency_key` or with a malformed key is strictly rejected.

**Execution**:
```sql
DO $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '180e75f0-360c-4c2d-93ec-60690ad2fa26', true);
  PERFORM public.place_order('{"store_id": "..."}'::jsonb);
  RAISE EXCEPTION 'SHOULD_HAVE_FAILED';
EXCEPTION WHEN OTHERS THEN
  ASSERT SQLERRM = 'MISSING_IDEMPOTENCY_KEY', 'Expected MISSING_IDEMPOTENCY_KEY exception';
END $$;
```
**Expected Outcome**: Throws `MISSING_IDEMPOTENCY_KEY`. Zero rows inserted.

---

### Scenario 3: Immutability of Idempotency Key via Column Guard
**Goal**: Verify that an update attempting to alter `idempotency_key` is rejected by `orders_column_guard`.

**Execution**:
```sql
DO $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.orders (customer_id, restaurant_id, restaurant_name, status, delivery_address, total_amount, idempotency_key)
  VALUES ('180e75f0-360c-4c2d-93ec-60690ad2fa26', '00000000-0000-0000-0000-000000000101', 'Test', 'pending', 'Addr', 1000, gen_random_uuid())
  RETURNING id INTO v_id;

  UPDATE public.orders SET idempotency_key = gen_random_uuid() WHERE id = v_id;
  RAISE EXCEPTION 'SHOULD_HAVE_FAILED';
EXCEPTION WHEN OTHERS THEN
  ASSERT SQLERRM LIKE '%orders_column_guard: idempotency_key is immutable%', 'Expected guard trigger exception';
  RAISE EXCEPTION 'TEST_PASSED_ROLLBACK';
END $$;
```
**Expected Outcome**: Transaction aborts with `TEST_PASSED_ROLLBACK`.

---

### Scenario 4: Client Resolver Unit Tests
**Goal**: Verify key reuse vs rotation logic in `checkoutIntentResolver.ts`.

**Command**:
```bash
npm test -- src/features/cart/application/__tests__/checkoutIntentResolver.test.ts
```
**Expected Outcome**: All tests pass:
- Identical cart fingerprint reuses the existing stored key.
- Altered cart (item, address, or coupon) rotates to a newly generated UUID.
- Item ordering does not alter fingerprint.

---

### Scenario 5: Double-Tap & UI In-Flight Protection
**Goal**: Verify that rapid sequential taps on the checkout confirmation button submit a single network mutation.

**Manual Verification**:
1. Open checkout screen with cart items.
2. Rapidly double-tap "تأكيد الطلب".
3. Check network log in debugger: exactly one `POST /rest/v1/rpc/place_order` request is dispatched.
4. User navigates smoothly to `/orders/[id]`.
