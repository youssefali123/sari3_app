We need to update the Sari3 order lifecycle specification and implementation plan to support customer cancellation, real-time cancellation propagation, pending-order expiration, and customer order-history hiding.

IMPORTANT:
Do NOT immediately implement code.
First inspect the existing Sari3 specifications, constitution, database schema/migrations, order domain/application/infrastructure code, RPCs, realtime implementation, notification_events pipeline, driver available-orders flow, customer orders flow, and existing push notification specification.

Then update the relevant SpecKit specification/tasks/contracts/data-model documentation consistently.

Follow the existing Sari3 constitution and architecture:
- Feature-first / Screaming Architecture
- Lightweight Clean Architecture per feature
- Dependency direction: Presentation → Application → Domain ← Infrastructure
- TanStack Query for server state
- Redux Toolkit only for cart/local client state
- Supabase/Postgres is the server authority
- Database operations that affect order state must be atomic
- Realtime and push notifications are separate concerns
- Do not introduce unnecessary abstractions
- Do not introduce GPS/location tracking
- Do not introduce online/card payments
- Keep the current MVP scope
- Preserve the existing claim_order() authority for driver assignment

==================================================
1. CUSTOMER ORDER CANCELLATION
==================================================

Allow the customer to cancel their own order at any order phase EXCEPT after the order has reached `delivered`.

Expected lifecycle behavior:

pending          → cancelled
accepted         → cancelled
preparing        → cancelled
out_for_delivery → cancelled

But:

delivered → NOT allowed
cancelled → NOT allowed
expired   → NOT allowed

The cancellation decision MUST be server-authoritative.

Do NOT allow the React Native client to directly modify the order status to `cancelled`.

Introduce an atomic server-side RPC:

cancel_order(order_id)

The server-side operation must:
1. Authenticate the current user.
2. Verify that the current user owns the order (customer_id = auth.uid()).
3. Verify that the current order status is cancellable.
4. Atomically transition the order to `cancelled`.
5. Reject cancellation if the order is already `delivered`, `cancelled`, or `expired`.
6. Return a clear success/error result.
7. Prevent race conditions with driver claim/status transitions.

IMPLEMENTATION NOTE (resolved — do not re-litigate): cancel_order() only
needs to change `status` and `updated_at`, both already permitted by
the existing orders_column_guard trigger. Do NOT add a new
`cancelled_at` column and do NOT use the app.order_maintenance GUC
escape hatch for this function — that escape is reserved for functions
that also need to touch driver_id (claim_order, release_order), which
cancel_order does not.

CRITICAL — DOCUMENT THIS EXPLICITLY IN plan.md, DO NOT SKIP:
This deliberately reopens transition edges that were intentionally
CLOSED during the 003 driver-fulfillment remediation. accepted →
cancelled and preparing → cancelled were removed from
validate_order_transition specifically to stop a DRIVER from cancelling
a customer's order — the trigger's own inline hint currently states
cancellation is reachable only from pending. Reopening these edges
(plus the brand-new out_for_delivery → cancelled) is safe ONLY because:
(a) there are no client-facing RLS UPDATE policies on `orders` granting
open write access to these columns, and (b) cancel_order() will be
the sole product of any X → cancelled transition, and it independently
verifies customer_id = auth.uid() before acting. plan.md MUST state
this reasoning explicitly, or a future reader will conclude the 003
safeguard was carelessly weakened rather than deliberately
re-scoped to a verified-ownership RPC.

Also treat allowing cancellation during out_for_delivery (driver
potentially already en route / at the door) as an explicit product
decision — document it as such, do not silently allow it as a side
effect of the transition-map change.

CRITICAL — RESOLVE BEFORE PLANNING, DO NOT LEAVE TWO PARALLEL PATHS:
Before finalizing the plan, read the live RLS policies on `orders` and
confirm whether `orders_update_own_customer_cancel` (the pre-existing
policy allowing a customer to directly UPDATE their own `pending`
order to `cancelled`, predating this feature) still exists. If it
does, the plan MUST explicitly decide to DROP it and consolidate ALL
customer cancellation exclusively through cancel_order() — matching
the same consolidation precedent already applied when the direct
client-insert policies for orders were dropped in favor of
place_order() alone during the 003 remediation. Do not leave both a
direct RLS UPDATE path and the new RPC path coexisting for the same
action; that duplication is exactly the kind of undocumented parallel
enforcement path this project has previously identified and closed.

==================================================
2. CUSTOMER CANCELS A PENDING ORDER
==================================================

If the customer cancels an order while it is still `pending`, it must no longer appear in Available Orders, in real time, without relying on a client-side refresh timer.

Do NOT delete the order from the database. The order remains with status = `cancelled`.

BEFORE building any new realtime plumbing for this: inspect
emit_driver_pool_signal's existing defensive handling. It already
fires a pool-exit signal on pending → {accepted, cancelled, rejected}
transitions (built during 004). Confirm this live, and if confirmed,
simply extend the same condition to also cover `expired` (section 9)
rather than building a second signal path. Do not invent new realtime
infrastructure if this already covers the requirement.

==================================================
3. CUSTOMER CANCELS AFTER DRIVER ACCEPTED
==================================================

If a driver has already accepted/claimed the order and the customer subsequently cancels it, the driver must see "Customer cancelled this order" in real time on their active-order screen, and must no longer be able to perform:

cancelled → preparing
cancelled → out_for_delivery
cancelled → delivered

These rules must be enforced server-side. validate_order_transition
already denies any transition FROM cancelled by default (default-deny
structure) — confirm this still holds once new edges INTO cancelled
are added; do not weaken that default-deny behavior.

BEFORE building any new realtime plumbing for this: confirm whether
the driver's existing subscription to their own active-order row
(already required for the Active Order screen, RLS-granted SELECT on
that specific row) already delivers this update for free. Only build
something new if this confirmation fails.

The order must also stop counting as the driver's active delivery for
the one-active-order-per-driver rule — confirm this against whatever
mechanism currently enforces that rule (driver_profiles.current_order_id
/ sync_driver_current_order) and extend it to clear on cancellation
exactly as it already does for delivered/rejected.

==================================================
4. REALTIME CANCELLATION
==================================================

Use the existing Sari3 Realtime architecture. Do not create a second realtime architecture. Reuse OrderRealtimeService / driver_pool_signals where appropriate. Do not mix realtime delivery with push notification delivery.

==================================================
5. PUSH NOTIFICATION FOR DRIVER CANCELLATION — ACTOR-AWARE, NO SELF-ECHO
==================================================

If a driver is assigned when the customer cancels, notify that driver via the existing notification pipeline (trigger → notification_events → webhook → Edge Function → Expo Push).

CRITICAL — RESOLVED DESIGN, IMPLEMENT EXACTLY THIS WAY:
The existing 004 notification trigger fires a generic `order_cancelled`
event on any transition into `cancelled`, which was fine when the only
actor who could ever cancel was the customer cancelling their own
`pending` order (no driver to notify, and notifying the customer about
their own action was arguably redundant but harmless). Now that
cancel_order() can cancel orders with an assigned driver, this becomes
a real problem: the customer would receive a push saying "your order
was cancelled" for an action they themselves just took — a confusing
self-echo.

Fix: cancel_order() must set a transaction-scoped GUC identifying the
actor, e.g.:

  perform set_config('app.cancellation_actor', 'customer', true);

Use a NEW, DEDICATED GUC for this — do NOT repurpose app.order_maintenance,
which has an established, different meaning (column-guard bypass for
claim_order/release_order). Mixing purposes on one GUC will confuse
future readers.

The notification trigger must then read this GUC to decide event
generation:
- Assigned driver exists → generate a driver-facing
  `order_cancelled_by_customer` event (per section 15).
- Do NOT generate a customer-facing "your order was cancelled" push
  when app.cancellation_actor = 'customer' — the customer already knows,
  they just did it. (If a future actor, e.g. a store, can also cancel,
  THAT path should notify the customer — this GUC-based branch is what
  makes that future distinction possible without another redesign.)

Reuse the existing event_seq-based dedupe_key mechanism
(order_id:event_type:event_seq) exactly as-is. Do NOT invent a new
dedupe scheme.

Do not send a driver cancellation notification if there is no assigned
driver. Do not expose unnecessary customer PII.

==================================================
6. NEW ORDER EXPIRATION RULE
==================================================

A `pending` order must not remain available to drivers indefinitely. If unclaimed for more than 30 minutes, it transitions pending → expired and must no longer appear in Driver Available Orders.

Do NOT implement this with client-side timers, local app state, or driver-side filtering only. Must be server/database authoritative.

CONFIRMED FROM LIVE PROJECT STATE: the pg_cron extension is installed
on this Supabase project (version 1.6.4) but NOT currently enabled.
Enabling it (`CREATE EXTENSION IF NOT EXISTS pg_cron;`) is a single,
ordinary migration — this is NOT new infrastructure, it is activating
something already present. Do this as its own migration, then in a
separate step schedule a function to run every 1–2 minutes that
atomically transitions eligible orders. Do not propose any external
scheduler, cron service, or client-triggered polling mechanism.

==================================================
7. EXACT EXPIRATION CONDITION
==================================================

A pending order is eligible for expiration when status = `pending` AND its age (using the existing created_at column and server time now() — never device time) exceeds 30 minutes.

CRITICAL: this 30-minute threshold will be referenced in at least three
places (claim_order's live age check, the expiration function's own
WHERE clause, and get_available_orders' safety-boundary filter). Define
it ONCE as a single source of truth (a SQL function returning the
interval, e.g. public.pending_order_ttl(), or a well-documented shared
constant) and reference it from all three call sites. Do not hardcode
`interval '30 minutes'` independently in multiple places — that
duplication risks drift if the value ever changes.

The expiration operation must be a single atomic conditional UPDATE
(same pattern as claim_order/release_order):

UPDATE orders SET status = 'expired', updated_at = now()
WHERE status = 'pending' AND created_at < now() - public.pending_order_ttl();

==================================================
8. RACE CONDITION: DRIVER ACCEPT VS EXPIRATION
==================================================

The system must prevent an expired order from being claimed, REGARDLESS of whether the scheduled expiration job has already run. claim_order()'s existing atomic conditional UPDATE must be extended to independently check the age condition live (using the same single-source-of-truth threshold from section 7), not rely solely on stored status.

Verify Scenario 8 (claim attempt exactly at the expiration boundary) with an actual concurrency test, not just code review — per this project's established testing standard for anything claim_order-adjacent.

==================================================
9. EXPIRED STATUS — RESOLVED DECISION, DO NOT RE-DERIVE
==================================================

Add `expired` as a NEW, 8th terminal status in the order_status enum — do NOT reuse the existing `rejected` status, even though it is currently dead/unused (zero rows, zero write paths; only referenced defensively).

Reasoning (final, do not reopen): `rejected` is deliberately reserved
for a future actor-initiated decision (e.g. a restaurant declining an
order), semantically distinct from `expired` (a system timeout with no
actor decision). Reusing `rejected` would recreate the overloaded-
meaning risk this project already hit once (the storeAddress/customer-
address naming incident).

CRITICAL POSTGRES CONSTRAINT — SEQUENCE MATTERS:
`ALTER TYPE order_status ADD VALUE 'expired'` CANNOT be used within the
same transaction it was added in (a well-known Postgres restriction on
enum additions). This MUST be split across two separate migrations:
migration N adds the enum value and commits; migration N+1 (a later
file, applied after N) is the first to actually reference 'expired' in
any function body, trigger, or CHECK constraint. Getting this wrong
will cause deployment to fail outright — this is the same class of
issue this project has hit before with sequencing assumptions.

Required changes:
- Migration A: ALTER TYPE order_status ADD VALUE 'expired'.
- Migration B (separate, later): add `pending → expired` to
  validate_order_transition's allowed map (terminal, no outgoing
  transitions); extend emit_driver_pool_signal and
  sync_driver_current_order to treat `expired` exactly as they already
  treat `rejected` (pool-exit, clear-pointer) — ADD alongside, do not
  replace existing `rejected` handling.
- Client: add `Expired = 'expired'` to OrderStatus.ts and the status
  badge component, displayed as "Expired".
- Leave `rejected` completely untouched and unused by this feature.

==================================================
10. CUSTOMER EXPERIENCE FOR EXPIRED ORDERS
==================================================

Customer sees "Expired" in order history and can tap "Order Again", which rebuilds the cart from the old order's items, revalidates current product availability/add-ons/prices/promotions, and creates a genuinely NEW order only after customer confirmation at checkout. Never auto-create an order. The old order remains immutable.

If Order Again is triggered while the cart already has items from a different store, route through the existing single-store cart conflict prompt — never silently replace the cart.

==================================================
11. DRIVER AVAILABLE ORDERS
==================================================

The available-orders query must filter status = 'pending' AND age within the threshold from section 7, AND all existing eligibility rules (role, is_available, no active delivery) — as an additional safety boundary, not the expiration mechanism itself (section 6's pg_cron job is the actual mechanism). Both cancellation and expiration must remove an order from the pool in real time via the same driver_pool_signals mechanism (section 2) — do not build a separate signal path for expiration.

==================================================
12. DRIVER ACTIVE ORDER AFTER CUSTOMER CANCELLATION
==================================================

Covered by section 3. Do not silently remove the order from the driver's view without explaining the reason.

==================================================
13. CUSTOMER ORDER HISTORY DELETION — MUST BE AN RPC, NOT A DIRECT COLUMN WRITE
==================================================

Allow the customer to remove an order from their own visible history WITHOUT physically deleting it. Do NOT use DELETE FROM orders.

CRITICAL — RESOLVED DESIGN, DO NOT IMPLEMENT AS WRITTEN BELOW WITHOUT THIS CORRECTION:
A naive reading of "add a customer_hidden_at column and let the
customer set it" is NOT achievable as literally stated — there are no
client-facing RLS UPDATE policies on `orders` granting the customer
direct write access to arbitrary columns, and orders_column_guard
would reject a write to customer_hidden_at even if a policy existed,
since it isn't in the guard's allowlist. "Enforce via RLS, not
application logic alone" (section 17's own requirement) means this
must be implemented as a dedicated RPC:

hide_order(order_id)

matching cancel_order()'s exact pattern: SECURITY DEFINER, verifies
customer_id = auth.uid(), then sets customer_hidden_at = now(). Do NOT
add customer_hidden_at to orders_column_guard's allowlist as an
alternative — keep the guard's allowlist exactly as-is and route this
through its own RPC instead, consistent with how every other
customer-initiated order mutation in this project works.

Customer order-history queries exclude rows where customer_hidden_at IS NOT NULL. A customer must never be able to hide another customer's order — enforced by hide_order()'s own ownership check, not by a client-writable RLS predicate.

==================================================
14. ORDER HISTORY + ORDER AGAIN
==================================================

"Remove from history" never means physical deletion. If Order Again is triggered from a hidden order via any entry point, use the same safe rebuild/revalidation process from section 10. Never mutate the historical order to create the new one.

==================================================
15. NOTIFICATION EVENTS
==================================================

Add event types: `order_cancelled_by_customer` (driver-facing only, per section 5's actor-aware suppression) and `order_expired`.

RESOLVED: yes, send the customer a push notification when their order
expires. It is the one event in this whole feature the customer cannot
otherwise discover without opening the app (unlike cancellation, which
they initiated themselves), it's the only delivery channel when the
app is closed, and it prevents an order silently looking "still
pending" forever from the customer's perspective. Make `order_expired`
a distinct event type from any driver-facing event — do not conflate
the two audiences in one notification template.

Reuse the existing event_seq-based dedupe_key identity exactly as-is for both new event types. Do not invent a new dedupe scheme.

==================================================
16. IMMUTABLE ORDER HISTORY
==================================================

Cancellation/expiration change lifecycle status only. Customer history hiding changes visibility only (via hide_order(), section 13). Neither operation may rewrite historical item/address snapshots.

==================================================
17. RLS / SECURITY
==================================================

Customer must only be able to, via RPC (never direct table UPDATE):
- cancel their own eligible orders (cancel_order())
- hide their own orders from their own history (hide_order())

Customer must NOT be able to: cancel another customer's order, directly set arbitrary order statuses, mark an order as expired, modify driver assignment, modify historical order snapshots.

Driver must NOT be able to: cancel customer orders, claim expired orders, update cancelled/expired/delivered orders.

Per section 1's resolution: confirm orders_update_own_customer_cancel is dropped, not left coexisting with cancel_order().

Expiration is server-side only (pg_cron function + claim_order's live age check). Never expose service-role credentials to the mobile client.

==================================================
18. DOMAIN / APPLICATION / INFRASTRUCTURE
==================================================

Domain: add `expired` to the order status type; represent isCancellable(order) / isExpired(order) as pure business logic, independent of Supabase/React Native.

Application: cancellation use case via OrderRepository → cancel_order(); hide-from-history use case → hide_order(); Order Again use case rebuilding cart from snapshot + revalidating + handing off to the existing checkout flow (no parallel checkout path); enforce the single-store cart conflict rule during Order Again.

Infrastructure: cancel_order(), hide_order(), expire_stale_pending_orders() (pg_cron-scheduled), extended claim_order(), driver_pool_signals extension, notification event integration.

Presentation: cancel action + confirmation, cancelled/expired states (customer + driver views), driver cancellation notice on active-order screen, remove-from-history action, Order Again action wired into existing checkout, realtime UI updates throughout.

==================================================
19. DO NOT BREAK EXISTING ORDER FLOW
==================================================

Preserve pending → accepted → preparing → out_for_delivery → delivered. Do not remove or weaken claim_order(), release_order(), driver eligibility rules, RLS, immutable snapshots, orders_column_guard, the existing notification pipeline, or existing realtime behavior.

CRITICAL — CONCURRENT STATUS-ADVANCE VS CANCELLATION RACE:
Inspect the driver's status-advance function (advance_order_status or
equivalent). If its WHERE clause currently matches only on order id
(reading current status beforehand in a separate step), a driver
advancing status at the exact moment the customer cancels will hit the
transition-validation trigger's raised exception — an ugly error
dialog — rather than a clean "no longer active" failure. Widen that
function's WHERE clause to include AND status = v_expected_current_status
(matching the same zero-rows-means-cleanly-failed pattern already used
by claim_order and release_order), so this race produces a clean,
handleable failure instead of a raised database exception surfacing as
a raw error to the driver.

==================================================
20. SPEC/TASK UPDATE BEFORE IMPLEMENTATION
==================================================

Before writing implementation code, inspect and report on: current spec/constitution, order schema/migrations, order status enum, claim_order(), release_order(), advance_order_status (per section 19's race note), driver_pool_signals + its emit trigger, live RLS policies on orders (per section 1's consolidation requirement), driver available-orders implementation, customer order-history implementation, OrderRealtimeService, notification_events + trigger design, existing push notification tasks.

Then update spec.md, plan.md, data-model.md, contracts/, tasks.md to explicitly document every resolved decision in this document — the actor-aware GUC mechanism (section 5), the hide_order() RPC (section 13), the orders_update_own_customer_cancel consolidation (section 1), the two-migration enum sequencing (section 9), and the single source of truth for the 30-minute threshold (section 7).

==================================================
21. ACCEPTANCE CRITERIA
==================================================

Scenario 1: Customer cancels pending order → cancelled, remains in DB, disappears from Available Orders in real time.
Scenario 2: Customer cancels accepted order → cancelled, assigned driver sees it in real time AND receives push (order_cancelled_by_customer), driver can no longer progress it, customer does NOT receive a redundant "your order was cancelled" push.
Scenario 3: Customer cancels preparing order → same as Scenario 2's transition/notification behavior.
Scenario 4: Customer cancels out_for_delivery order → same, confirmed as an intentional product decision.
Scenario 5: Customer attempts to cancel a delivered order → rejected, remains delivered.
Scenario 6: Pending order unclaimed 30+ minutes → pg_cron transitions it to expired, disappears from Available Orders, customer sees "Expired" AND receives a push notification.
Scenario 7: Driver attempts to claim an expired order → rejected atomically.
Scenario 8: Driver claims at the exact expiration boundary → no race allows an expired order to be accepted (verified via an actual concurrency test).
Scenario 9: Customer taps Order Again on an expired order → old order unchanged, everything revalidated, new order only after confirmation.
Scenario 10: Customer removes an order from history via hide_order() → disappears from history, underlying record + snapshots intact.
Scenario 11: Customer attempts to hide another customer's order → rejected by hide_order()'s ownership check.
Scenario 12: Driver receives cancellation while app open → realtime UI updates immediately, no separate infrastructure needed if section 3's confirmation holds.
Scenario 13: Driver not actively viewing but has a valid push token → push delivered.
Scenario 14: No driver assigned when customer cancels a pending order → no driver notification generated, order disappears from pool.
Scenario 15 (NEW): Driver attempts to advance order status at the same moment the customer cancels it → clean, handleable failure (not a raw database exception surfaced to the UI).

==================================================
22. IMPORTANT IMPLEMENTATION CONSTRAINTS
==================================================

Do NOT:
- physically delete orders for customer history removal
- use client timers as the authoritative expiration mechanism
- allow clients to directly mutate order statuses or hide orders via direct column writes
- send HTTP requests from Postgres triggers
- bypass claim_order() authority
- allow expired orders to be claimed
- create duplicate notification/dedupe systems
- expose service-role secrets
- introduce GPS/location tracking, online payments, or an Admin dashboard
- reuse `rejected` for expiration (resolved, section 9)
- add a `cancelled_at` column or reuse app.order_maintenance for cancel_order() (resolved, section 1)
- reuse app.order_maintenance for actor identification (resolved, section 5 — use a new, dedicated GUC)
- leave orders_update_own_customer_cancel coexisting undocumented alongside cancel_order() (resolved, section 1)
- add customer_hidden_at to orders_column_guard's allowlist instead of using hide_order() (resolved, section 13)
- hardcode the 30-minute threshold in more than one place (resolved, section 7)

At the end, provide:
1. Files/specifications inspected.
2. Business rules added/changed.
3. Database/schema changes required (including the two-migration enum sequencing for `expired`).
4. RPC changes required (cancel_order, hide_order, expire_stale_pending_orders, extended claim_order, widened advance_order_status).
5. Realtime changes required (driver_pool_signals extension coverage).
6. Notification changes required (new event types, actor-aware GUC, dedupe_key reuse).
7. RLS/security changes required (including the orders_update_own_customer_cancel consolidation).
8. tasks.md changes.
9. Any migrations that need to be added, in correct sequence.
10. Any unresolved design decision that requires my approval (there should be very few — this document has already closed the major ones).

Do not claim the feature is implemented or verified until the relevant code/database behavior have actually been checked live — code review alone is not sufficient for anything touching claim_order, concurrency, or RLS.