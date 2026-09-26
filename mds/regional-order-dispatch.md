We need to add region/area-based order dispatch and store browsing to the Sari3 app: drivers only see orders from restaurants in areas they're assigned to, and customers browse restaurants/markets scoped to an area they select.

IMPORTANT:
Do NOT immediately implement code.
First inspect the existing Sari3 specifications, constitution, the restaurants table and its migrations, driver_profiles and driver-area-related tables (if any), get_available_orders() and its current filter conditions, the customer store-browsing query/screen, driver_pool_signals, and existing RLS policies on restaurants and driver-facing tables.

Then update the relevant SpecKit specification/tasks/contracts/data-model documentation consistently.

Follow the existing Sari3 constitution and architecture:
- Feature-first / Screaming Architecture
- Lightweight Clean Architecture per feature
- Dependency direction: Presentation → Application → Domain ← Infrastructure
- TanStack Query for server state, Redux Toolkit only for client state (cart, and now guest area selection — see section 5)
- Supabase/Postgres is the server authority
- Do not introduce GPS/location tracking or geolocation-based auto-detection of area
- Do not introduce an admin dashboard as part of this feature
- Keep the current MVP scope; do not over-engineer

==================================================
1. AREAS AS A HIERARCHICAL TABLE — FOR BROWSING/UI ONLY, NOT FOR MATCHING
==================================================

Represent areas (governorate, city, region, village — arbitrary depth) as a proper adjacency-list table, not an encoded string:

areas
- id
- name
- parent_area_id (nullable, references areas.id)

RESOLVED — DO NOT REVISIT: Do NOT store hierarchy as a delimited string
(e.g. "fayoum-senours"). This breaks on area names containing the
delimiter and cannot reliably support more than two levels. Use a real
self-referencing table so arbitrary depth works without schema changes.

CRITICAL — RESOLVED SEMANTICS, DO NOT REOPEN:
The parent/child relationship in `areas` is used ONLY to build a
drill-down browsing UI (e.g. "Fayoum" → shows "Senours", "Itsa" as
sub-options, plus a "Fayoum only" option). It is explicitly NOT used to
automatically roll up or expand matching at query time. There is no
recursive CTE anywhere in this feature's restaurant or order queries.
Matching a customer or driver to restaurants is always an EXACT
area_id match — selecting the parent "Fayoum" returns ONLY restaurants
whose area_id is literally Fayoum's id, never restaurants belonging to
Senours or Itsa, even though those are children of Fayoum in the tree.
This was confirmed against the actual product requirement: Fayoum has
its own restaurants (a, b), Senours has its own (c, d), and selecting
Fayoum must show ONLY (a, b).

==================================================
2. RESTAURANT/MARKET → AREA (ONE AREA, EXACT MATCH)
==================================================

Add area_id to restaurants, referencing the most specific area that
applies (typically a leaf-level area, e.g. a specific city/village, not
a whole governorate) — a restaurant belongs to exactly one area.

CRITICAL — RESOLVE BEFORE PLANNING:
Existing seeded restaurants currently have no area_id. Decide and
document explicitly, do not leave implicit:
(a) area_id is NOT NULL going forward, and a migration must backfill
    every existing restaurant to a real area before this ships (a
    restaurant left NULL would vanish from all area-filtered browsing
    the moment this feature goes live), OR
(b) area_id is nullable, and a NULL-area restaurant is treated as
    globally invisible to area-filtered browsing (safe-default-deny,
    consistent with this project's established security posture) until
    manually assigned.
Recommendation: (a) — backfill existing seed restaurants to a real
area in the same migration that adds the column, so nothing silently
disappears from the app at deploy time. State the final decision
explicitly in plan.md either way.

Assignment of a restaurant to an area remains a manual/admin operation
(SQL or Supabase Dashboard) for this MVP — there is no in-app UI for
this, consistent with how store/product/category management already
works (no merchant UI exists yet). Document this explicitly, the same
way driver account provisioning was documented as out-of-band in
auth-and-onboarding.

==================================================
3. DRIVER → AREA(S) (EXPLICIT MANY-TO-MANY, NO INHERITANCE)
==================================================

driver_areas
- driver_id (references driver_profiles.user_id)
- area_id (references areas.id)
- primary key (driver_id, area_id)

RESOLVED — DO NOT REOPEN: A driver may be linked to one or more areas,
and each link is explicit. There is NO automatic inheritance — linking
a driver to a parent area (e.g. "Fayoum") does NOT automatically grant
visibility into child areas (e.g. "Senours"). If a driver should cover
both, they must be explicitly linked to both area_id rows. This means
no recursive area-matching logic is needed anywhere in the driver-
facing pool query — a simple driver_areas.area_id IN (...) / exact join
is sufficient.

Assignment of a driver to area(s) is a manual/admin operation for this
MVP (same rationale as section 2) — no in-app UI.

A driver with zero assigned areas must see an empty available-orders
pool (safe-default-deny), never all orders regardless of area — this
must be enforced server-side in the pool query, not just as a UI empty
state.

==================================================
4. DRIVER AVAILABLE-ORDERS POOL — ADD AREA FILTER, DO NOT REBUILD
==================================================

Extend get_available_orders() (or equivalent) with an additional
condition: the order's restaurant.area_id must be in the calling
driver's driver_areas set. This is ADDED alongside every existing
filter (status = 'pending', not expired, is_available = true, role =
'driver', no conflicting active delivery) — none of those existing
conditions change.

Do NOT modify driver_pool_signals or its emit trigger for this feature
— it only signals "something changed in the pool," and the client
already refetches the filtered list via the RPC. The area filter living
inside that RPC is sufficient; no realtime infrastructure changes are
needed. Confirm this by inspecting driver_pool_signals live before
assuming otherwise.

==================================================
5. CUSTOMER AREA SELECTION
==================================================

The customer (including an unauthenticated guest — this app supports
guest browsing per auth-and-onboarding) selects an area through a
drill-down UI: pick a top-level area, then optionally narrow into a
sub-area if the system has one, or explicitly stay at the level chosen
("Fayoum only"). Whatever the customer lands on becomes a single
concrete area_id used for exact-match filtering of restaurants/markets
— never a set of areas, never a parent-plus-descendants expansion.

Storage of the selected area follows the same pattern already
established for the guest cart: held in Redux (client-local state) so
guest browsing works before authentication, and if the user is
authenticated, persist the selection to their profile so it survives
across sessions/devices — do not duplicate this into TanStack Query,
since it is client preference state, not server data being fetched.

Changing the selected area re-filters the home screen's
restaurant/market listing by the new area_id (exact match). Do not
implement this as a distance/radius calculation — this is a discrete
area selection, not geolocation.

==================================================
6. RLS / SECURITY
==================================================

`areas` is public read-only reference data — readable by anyone,
including unauthenticated/anon (needed for guest area selection). No
client write access.

`driver_areas`: a driver may SELECT their own assignment rows (to show
their current coverage, if the UI needs it) but must not be able to
INSERT/UPDATE/DELETE their own or any other driver's area assignments
— this remains a manual/admin operation per section 3, enforced by
having no client-facing write policy at all, not by relying on
application-layer discipline.

`restaurants.area_id`: readable as part of normal restaurant browsing
(already public); no new customer-facing write access — assignment
stays manual per section 2.

The available-orders pool query's area filter must be enforced
server-side inside the RPC, not left to client-side filtering that a
modified client could bypass to see orders outside the driver's
assigned areas.

==================================================
7. DOMAIN / APPLICATION / INFRASTRUCTURE
==================================================

Domain: Area entity (id, name, parentAreaId) in a shared or
restaurants-adjacent location — decide the cleanest home during
planning and justify it (mirroring how RestaurantCategory's placement
was decided in an earlier feature).

Application: area-selection use case for the customer (persist to
Redux + profile if authenticated); driver-area-scoped pool fetching via
the existing available-orders hook, just with the new filter applied
server-side.

Infrastructure: SupabaseAreaRepository (read-only for areas), extended
SupabaseStoreRepository/product-browsing queries to filter by
area_id, extended get_available_orders() RPC.

Presentation: area drill-down picker (for guests and customers),
current-area indicator on the home screen, empty state for "no
restaurants in this area yet" and for the driver's "no areas assigned"
state.

==================================================
8. DO NOT BREAK EXISTING FLOWS
==================================================

Do not change existing eligibility rules (role, is_available, active-
delivery constraint, expiration/age filtering from the cancellation-
and-expiration feature) — the area filter is additive. Do not touch
driver_pool_signals, claim_order(), release_order(), or
orders_column_guard. Do not affect existing checkout, cart, favorites,
promotions, or coupon logic — area selection filters what's browsable,
it does not change order placement mechanics.

==================================================
9. OUT OF SCOPE
==================================================

Automatic area detection via GPS/device location, delivery radius or
distance-based matching, an admin UI for managing areas/assignments,
area-based delivery fee variation, recursive/parent-inclusive matching
of any kind (explicitly rejected in section 1).

==================================================
10. ACCEPTANCE CRITERIA
==================================================

Scenario 1: Customer selects "Fayoum" → sees only restaurants with
area_id = Fayoum (e.g. a, b) — not restaurants belonging to Senours or
Itsa, even though those are children of Fayoum in the areas tree.

Scenario 2: Customer drills into "Fayoum" → sees "Senours" and "Itsa"
as sub-area options, plus the ability to stay on "Fayoum only." Selecting
"Senours" shows only Senours's restaurants (c, d).

Scenario 3: Guest (unauthenticated) selects an area → selection persists
in-session via Redux and filters browsing correctly, without requiring
login.

Scenario 4: Authenticated customer selects an area → selection is saved
to their profile and is restored on next login/session.

Scenario 5: Driver assigned to Fayoum only (not Senours) → their
available-orders pool shows only orders from Fayoum restaurants, even
though Senours is a child of Fayoum — no inheritance.

Scenario 6: Driver assigned to both Fayoum and Senours explicitly →
sees pool orders from both, via two explicit driver_areas rows.

Scenario 7: Driver with zero area assignments → sees an empty pool,
not all pending orders.

Scenario 8: A restaurant with no area_id assigned (if nullable per
section 2's decision) → does not appear in any area-filtered customer
browsing or driver pool query.

Scenario 9: Existing seeded restaurants, post-migration → all have a
valid area_id and remain visible to customers browsing the correct
area (verifying the backfill in section 2 didn't silently hide them).

Scenario 10: A non-admin client attempts to write to driver_areas or
change a restaurant's area_id directly → rejected by RLS.

==================================================
11. IMPLEMENTATION CONSTRAINTS
==================================================

Do NOT:
- encode area hierarchy as a delimited string (resolved, section 1)
- use a recursive CTE or any parent-inclusive expansion for matching
  restaurants to a selected area or orders to a driver (resolved,
  section 1 and 3)
- let a driver with no area assignments see any orders (resolved,
  section 3)
- add a customer-facing or driver-facing write path to driver_areas or
  restaurants.area_id (resolved, section 6)
- implement area selection as geolocation/GPS/radius-based
- modify driver_pool_signals, claim_order(), release_order(), or
  orders_column_guard
- build an admin UI for area management as part of this feature
- leave existing seeded restaurants without a valid area_id after
  this ships (resolved, section 2)

At the end, provide:
1. Files/specifications inspected.
2. Business rules added.
3. Database/schema changes required (areas, driver_areas, restaurants.area_id, the backfill migration).
4. RPC/query changes required (get_available_orders() extension, restaurant-browsing query extension).
5. RLS changes required.
6. Client state changes required (Redux area selection, profile persistence for authenticated users).
7. tasks.md changes.
8. Any migrations that need to be added, in correct sequence (the backfill migration must run before or alongside making area_id NOT NULL, if that path is chosen).
9. Any unresolved design decision that requires my approval (there should be very few — this document already resolved the hierarchy-storage, matching-semantics, and inheritance questions).

Do not claim the feature is implemented or verified until the relevant code/database behavior have actually been checked live.