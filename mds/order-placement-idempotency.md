
We need to make order placement idempotent so that a repeated or retried place_order request can never create a second order or a second coupon redemption.

IMPORTANT:
Do NOT immediately implement code.
First inspect: the constitution, the live place_order source (pg_get_functiondef), the orders table definition and indexes, orders_column_guard, the checkout screen's place-order handler (src/app/checkout.tsx), the cart persistence code (src/shared/lib/store.ts and the cart slice), src/shared/lib/queryClient.ts, and SupabaseOrderRepository.placeOrder.

Then update the SpecKit artifacts (spec.md, plan.md, data-model.md, contracts/, tasks.md) consistently.

Follow the existing architecture and constitution:

- Feature-first, lightweight Clean Architecture, dependency direction Presentation → Application → Domain ← Infrastructure
- Domain/Application must not import Expo, Supabase, React Native, AsyncStorage
- Supabase/Postgres is the server authority; order-state-affecting operations are atomic
- Redux Toolkit for client-local state only
- Do not add unnecessary abstractions

==================================================
0. VERIFIED EVIDENCE (live, do not re-derive)
=============================================

- Calling place_order twice with an identical payload produced 2 orders and 2 coupon_redemptions (verified on the live database in a rolled-back transaction).
- queryClient.ts sets mutations.retry = 1 globally, so place_order is re-sent automatically after a transient network failure that happens after the server committed.
- No idempotency column, key, or unique index exists on orders.
- The checkout button disables via isPending, which updates asynchronously: a fast double tap can send two requests.

==================================================

1. SERVER: IDEMPOTENCY KEY — RESOLVED, DO NOT REOPEN
   ==================================================

- Add orders.idempotency_key uuid (nullable for legacy rows) and a UNIQUE index on (customer_id, idempotency_key). Postgres permits multiple NULLs, so legacy rows are unaffected. No separate idempotency table.
- Keep place_order's signature EXACTLY as it is today: place_order(p_payload jsonb). The key travels inside p_payload as idempotency_key. Use CREATE OR REPLACE on the same signature. Do NOT create an overload with a different signature: the old unprotected version would stay callable and bypass the protection.
- The RPC REQUIRES the key (raise MISSING_IDEMPOTENCY_KEY if absent or malformed). The app is pre-launch, so there are no old clients to support.
- Replay semantics: when the same (customer, key) arrives again, return the ORIGINAL order in exactly the same response shape as the first call. Do NOT re-run pricing, coupon validation/redemption, or anything that fires notifications. No new row, no second coupon redemption, no second notification_events row, no second pool signal. The lookup MUST be scoped to auth.uid(); one customer must never see or collide with another customer's key.
- Concurrency: two simultaneous calls with the same (customer, key) must produce exactly one order. Serialize with pg_advisory_xact_lock keyed on customer + key, taken right after the auth/role checks and before the existence check; the unique index is the backstop. If you propose a different mechanism, justify it and test it the same way.
- Preserve EVERYTHING else in place_order: every existing RAISE and its order of evaluation, SECURITY DEFINER, SET search_path, snapshots, coupon logic, store-closed logic, role check, and grants (REVOKE FROM PUBLIC/anon, GRANT to authenticated). After the change, verify with has_function_privilege that privileges are unchanged. Read the live function first and make the smallest possible edit; show before/after source.
- orders_column_guard is a denylist of named columns, so a new column is unprotected by default. Add exactly ONE more immutability check, for idempotency_key, and change nothing else in the guard. This is the single permitted modification of the guard; document why.
- If the same key arrives with a materially different payload, default to returning the existing order without comparing payloads, and rely on the client rule in section 2 that a changed purchase gets a new key. If you see a cheap, reliable mismatch check, propose it as an open decision; do not build elaborate payload hashing.

==================================================
2. CLIENT: KEY LIFECYCLE — RESOLVED, DO NOT REOPEN
===================================================

- Generate the key lazily at the first confirm attempt, NOT on screen mount.
- Persist {key, fingerprint} together with the existing persisted cart state (same AsyncStorage persistence), so it survives an app kill and reopen. The fingerprint is a deterministic string of the purchase intent (store + items + delivery address id + coupon code). Handle previously persisted cart data that lacks the new field.
- At confirm time, compute the current fingerprint: equal to the stored one → reuse the key (re-tap after a network error, or retry after restart); different → generate a new key and store it with the new fingerprint.
- Clear {key, fingerprint} only on confirmed success (the order is returned, including via replay). The cart is already cleared only in onSuccess; keep that.
- Put this resolve logic in a small pure function in the Application layer taking an injected newKey() function, so it is unit-testable and the layer stays free of Expo imports. Supply the UUID from expo-crypto at the infrastructure/presentation boundary. Do NOT rely on a global crypto.randomUUID existing in React Native/Hermes.
- Add a synchronous in-flight guard (e.g. a ref) on the confirm handler so a fast double tap sends one request. The server protection still applies if two reach it.
- A replayed response is handled exactly like a first success (navigate to the order).
- Ensure the persisted key state hydrates together with the cart.

==================================================
3. MUTATION RETRY — RESOLVED, DO NOT REOPEN
============================================

Set the global mutations.retry to 0. Principle: a network error on a write means the OUTCOME IS UNKNOWN, so the client must not blindly resend. For place_order, a user re-tap with the same key is now safe. Reconciling driver-side mutations after unknown outcomes (refetching state) and error classification/Arabic messages are OUT OF SCOPE here and belong to the separate error-handling-and-resilience feature. Do not change query retry settings in this feature.

==================================================
4. OUT OF SCOPE
===============

Error translation to Arabic, onlineManager/focusManager wiring, Realtime recovery, the root error boundary, cart hydration awaiting and cart price revalidation, and any change to claim_order, release_order, cancel_order, coupon logic, pricing logic, notification triggers, or pool-signal triggers. Any new error code introduced here (e.g. MISSING_IDEMPOTENCY_KEY) must be listed in the report so the error-handling feature can map it.

==================================================
5. ACCEPTANCE SCENARIOS
=======================

1. Same key sent twice sequentially → exactly 1 order, 1 coupon redemption, 1 set of notification events; both calls return the same order id.
2. Two TRULY concurrent calls with the same key → exactly 1 order.
3. Different keys with identical payloads → 2 orders (legitimately separate purchases).
4. Missing or malformed key → rejected, no order created.
5. Server commits, the response is lost, the user taps confirm again → same key → original order returned, no duplicate, the app navigates to it.
6. App killed right after the tap, reopened, confirm tapped again with the same cart → persisted key reused → no duplicate.
7. Fast double tap → one in-flight request on the client; even if two reach the server → one order.
8. Cart, address, or coupon changed after a failed attempt → new key.
9. After a successful order → key cleared; the next checkout uses a fresh key.
10. Customer B sends a key that customer A already used → B gets their own order; nothing of A's is returned.
11. Usage-limited coupon: a replay does not consume a second redemption.
12. Regression: every pre-existing place_order behavior and error (STORE_CLOSED, coupon errors, role check, etc.) unchanged.
13. A simulated network failure on a mutation is NOT automatically re-sent (retry 0).

==================================================
6. VERIFICATION STANDARD (live, not code review)
================================================

- Scenarios 1, 3, 4, 10, 11, 12 on the live database in rolled-back transactions.
- Scenario 2 needs a genuine race with TWO CONCURRENT CONNECTIONS (a single session cannot interleave). Because this requires committed rows, a committed test order fires the notification webhook. BEFORE running it, verify and report that no driver is currently available/eligible and that no push can be delivered. If there is ANY doubt, STOP and ask me first. Afterwards delete every artifact created (orders, order_items, coupon_redemptions, notification_events, driver_pool_signals rows), restore any coupon usage counters, and report the cleanup.
- Quote the live place_order source before and after.

==================================================
7. CONSTRAINTS
==============

Do NOT: create a second place_order overload; add a separate idempotency table; touch orders_column_guard beyond the single idempotency_key check; use client timers or client-only checks as the protection; rely on a global crypto.randomUUID; put the key logic inside the screen component; modify unrelated RPCs or triggers; add Expo imports to Domain/Application.

At the end provide: files inspected; business rules added; schema changes; the place_order diff; client state changes; tasks.md changes; migrations in sequence; new error codes introduced; unresolved decisions needing my approval (should be very few).

Do not claim anything is implemented or verified until it has been checked live.
