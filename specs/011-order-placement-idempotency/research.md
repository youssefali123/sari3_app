# Research & Architectural Decisions: Order Placement Idempotency

**Feature**: `011-order-placement-idempotency`
**Date**: 2026-10-19

## Technical Context & Decisions

### 1. Database-Level Concurrency Serialization & Idempotency Key Storage

- **Decision**: Add `idempotency_key uuid` column directly to `public.orders` with a unique index `orders_customer_idempotency_idx` on `(customer_id, idempotency_key)`. Guard concurrent executions using transaction-scoped PostgreSQL advisory locks: `pg_advisory_xact_lock(hashtext(v_customer_id::text), hashtext(v_idempotency_key::text))` within the `place_order` RPC.
- **Rationale**:
  - A separate idempotency table would require dual-table writes and foreign key coordination, introducing extra I/O and migration complexity for zero benefit.
  - Adding a nullable `idempotency_key` to `orders` natively preserves legacy orders (PostgreSQL btree unique indexes treat `NULL`s as distinct).
  - PostgreSQL advisory transaction locks (`pg_advisory_xact_lock`) automatically release on transaction commit or rollback, serializing identical concurrent requests before they perform catalog checks or coupon locks. The unique index provides a hard engine-level constraint backstop.
- **Alternatives Considered**:
  - *Separate `order_idempotency_keys` table*: Rejected per project constitution Principle X (practical MVP simplicity over theoretical purity) and user constraint (resolved, do not reopen).
  - *Advisory lock on a single 64-bit bigint*: Using two 32-bit hashes (`hashtext(customer_id)`, `hashtext(idempotency_key)`) maps cleanly to the dual-argument `pg_advisory_xact_lock(int4, int4)`.
  - *Row-level locking on a parent table*: Involves locking customer or store rows, causing artificial bottlenecks across unrelated orders.

### 2. RPC Signature & Replay Semantics

- **Decision**: Retain the exact live signature `public.place_order(p_payload jsonb)`. Extract `idempotency_key` from `p_payload->>'idempotency_key'`. Require valid UUID format, raising `MISSING_IDEMPOTENCY_KEY` if absent or malformed. When an existing order matches `(customer_id, idempotency_key)`, immediately return the serialized order payload without re-evaluating pricing, coupon redemptions, or firing notifications/pool signals.
- **Rationale**:
  - Overloading the function signature (e.g. `place_order(jsonb, uuid)`) would leave the un-idempotent single-argument version callable in Postgres, violating security and integrity principles.
  - Replay semantics must return the exact same JSON structure as the initial order creation so client infrastructure (`SupabaseOrderRepository`) and callers (`checkout.tsx`) consume it seamlessly without branching.
  - Replay skips coupon updates, order insertions, and item insertions; hence no second coupon redemption is consumed and triggers on `orders` are not fired.
- **Alternatives Considered**:
  - *Signature overload `place_order(p_payload jsonb, p_idempotency_key uuid)`*: Rejected because the old RPC would remain active, creating an accidental bypass path.
  - *Payload hashing / diff check on replay*: Evaluated during `/speckit-clarify` and rejected in favor of Pure Replay to avoid database CPU overhead and fragile serialization comparison.

### 3. Orders Column Guard Update

- **Decision**: Update `public.orders_column_guard()` to add a single immutability check:
  `if new.idempotency_key is distinct from old.idempotency_key then raise exception 'orders_column_guard: idempotency_key is immutable' using errcode = '23514'; end if;`
- **Rationale**:
  - `orders_column_guard` is an explicit denylist trigger guarding all core order snapshot attributes.
  - Idempotency keys must be permanent once assigned to an order record to prevent replay tampering.
- **Alternatives Considered**:
  - *Omitting column guard*: Leaves `idempotency_key` modifiable by any future UPDATE query on orders, creating risk of corruption.

### 4. Client Idempotency Key Lifecycle & Purchase Intent Fingerprinting

- **Decision**: Generate the idempotency key lazily at the moment the user taps "Confirm Order". Compute a deterministic purchase intent fingerprint string:
  `${storeId}::${deliveryAddressId}::${couponCode ?? ''}::${sortedItemsFingerprint}`
  Persist `{ idempotencyKey, intentFingerprint }` in Redux and `@react-native-async-storage/async-storage` alongside the cart.
  If a confirm attempt occurs with an identical fingerprint (e.g., retrying after a network drop, or reopening after app kill), reuse the existing key. If the cart or address changed, generate a new key and update the stored fingerprint.
  Clear the key and fingerprint only on confirmed success (`onSuccess`).
- **Rationale**:
  - Eager generation on screen mount causes key burn if the user navigates away or modifies items.
  - Persisting the key and fingerprint in the existing cart storage ensures survivability across app kills, OS background memory reclaims, and device restarts.
  - Checking fingerprint equality guarantees that legitimate cart changes (adding a drink, changing delivery address) produce a new order rather than a stale replay.
- **Alternatives Considered**:
  - *In-memory only state (React state / ref)*: Does not survive app kills or background eviction during poor connectivity.
  - *Global crypto.randomUUID()*: Not reliably present on older Hermes / React Native JavaScript runtimes without polyfills. Must inject UUID generation via `expo-crypto` at the presentation/infrastructure boundary into a pure Application domain helper.

### 5. Client Synchronous In-Flight Guard

- **Decision**: Implement a synchronous `useRef<boolean>(false)` in `src/app/checkout.tsx` that guards `handlePlaceOrder()`. Taps while `isSubmittingRef.current === true` or `placeOrderMutation.isPending === true` are dropped synchronously.
- **Rationale**:
  - React state (`isPending`) updates asynchronously across the React render cycle. Two taps within 50ms will pass the disabled check before the next frame renders. A ref provides synchronous, immediate locking.

### 6. Mutation Retry Configuration

- **Decision**: Update `src/shared/lib/queryClient.ts` to set `mutations: { retry: 0 }`.
- **Rationale**:
  - Transient network failures on mutating HTTP requests have an unknown outcome (the server may have committed the transaction before the network dropped).
  - Blind automatic retries by the client data layer cause duplicate mutations. With `retry: 0`, user retries are explicit and protected by idempotency keys.
