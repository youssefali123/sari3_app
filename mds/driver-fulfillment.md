Enable authenticated drivers to fulfill customer orders end-to-end.

1. A driver can toggle their availability between Available and
   Offline. While Offline, the driver must not be able to see or
   access any new pending orders — this must be enforced by the
   backend, not just hidden in the UI.

2. While Available, a driver sees a live list of unclaimed orders,
   updated in real time as new orders appear or existing ones are
   claimed by other drivers. The list shows enough information to
   decide whether to accept (e.g. store name, distance/area, item
   count) without exposing the customer's exact delivery address or
   phone number before acceptance.

3. A driver can accept an available order. If another driver has
   already claimed it in the meantime, the acceptance must fail
   cleanly with a clear "no longer available" message — never
   silently succeed for two drivers on the same order.

4. Once accepted, the order becomes the driver's single active order,
   revealing full delivery details (address, customer contact) needed
   to complete it. A driver can only have one active order at a time:
   while an order is active, the available-orders list is hidden
   entirely rather than shown as disabled, and no other order can be
   accepted until the active one reaches `delivered` or is
   cancelled/rejected through another actor's action.

5. A driver can decline a specific available order before accepting
   it. Declining removes it from that driver's own list but must NOT
   affect the order's availability to other drivers — the order stays
   in the shared pool. The app must be able to show the driver their
   own past declines as part of their history (req 7).

6. A driver advances their active order through the standard lifecycle
   in strict order: accepted → preparing → out_for_delivery →
   delivered. Skipping states or moving backward is not allowed.

7. A driver can view their delivery history: past orders they
   completed, declined, or that were cancelled by the customer while
   still pending.

8. Customers receive their existing order-status visibility
   (already built) automatically as the driver updates status — no
   new customer-facing requirement here.

9. Only users with the driver role can access any driver-facing screen
   or action. A customer attempting to reach a driver screen is
   redirected away, and a driver attempting to place a customer order
   must be rejected by the server, not just hidden from the UI.

10. A driver has a profile screen showing their own info, current
    availability status, and a sign-out action — mirroring what
    customers already have.

11. If a driver accepts an order and is then unable to complete it
    (e.g. vehicle breakdown, restaurant closed), there must be some
    way for that order to stop being stuck on that driver forever.
    The exact mechanism (automatic release back to the pool, a
    required reason, staff intervention, a cooldown before the driver
    can accept again) is intentionally left open here and MUST be
    resolved in /speckit-clarify before planning — this is a new
    capability, not an extension of an existing one, and changes the
    order lifecycle if implemented.

Out of scope: GPS/live location tracking, delivery fee calculation
changes, driver ratings, multiple simultaneous active orders per
driver, admin driver management UI, automatically reassigning a
released order to a specific driver (vs. returning it to the shared
pool).

Edge Cases:

- A driver with no available orders sees an appropriate empty state,
  not a blank or frozen screen.
- A driver's availability toggle and role must both be verified
  server-side before any pool order becomes visible or claimable —
  a client that fakes the "Available" state must gain nothing.
- If a driver's profile record is missing or malformed on login
  (matching the equivalent edge case already defined for customers in
  auth-and-onboarding), the same explicit recoverable error state
  applies rather than a silent misroute into driver screens.
