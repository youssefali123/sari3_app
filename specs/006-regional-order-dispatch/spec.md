# Feature Specification: Regional Order Dispatch & Store Browsing

**Feature Branch**: `006-regional-order-dispatch`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: "create a specification for i want to create and all details in this file: @[mds/regional-order-dispatch.md]"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer Area Drill-Down Selection & Store Filtering (Priority: P1)

A customer (either an unauthenticated guest or an authenticated user) opens the Sari3 app to browse restaurants and markets. Rather than seeing an unfiltered or global list of stores across all locations, the customer selects their geographical area via a drill-down picker. The customer can select a top-level area (e.g., "Fayoum") or drill down into a sub-area (e.g., "Senours" or "Itsa"), or choose to view stores belonging specifically to the parent area ("Fayoum only"). 

Once an area is chosen, the catalog browsing view displays exclusively the restaurants and markets whose registered area exactly matches the chosen area ID. Stores belonging to sub-areas are never rolled up or included when browsing a parent area, and stores belonging to a parent area are never included when browsing a sub-area. If no stores exist in the selected area, a friendly empty state is presented.

**Why this priority**: Scoped browsing ensures customers only view stores that can fulfill orders in their immediate geographical vicinity, eliminating the confusion of ordering from stores located in distant cities or villages.

**Independent Test**: Can be tested independently by navigating the customer catalog interface, opening the area picker, selecting "Fayoum", and verifying that only restaurants tagged with Fayoum appear. Then selecting "Senours" and verifying that only Senours restaurants appear.

**Acceptance Scenarios**:

1. **Given** a customer opens the store browsing screen, **When** they tap the area selector and select a top-level area "Fayoum", **Then** the store listing displays only restaurants and markets assigned directly to "Fayoum" (exact match), excluding stores assigned to child areas such as "Senours" or "Itsa".
2. **Given** a customer is selecting an area, **When** they drill down into "Fayoum" and select the child area "Senours", **Then** the store listing displays only restaurants and markets assigned directly to "Senours".
3. **Given** a customer is browsing an area that currently has zero restaurants or markets registered, **When** the store list loads, **Then** the customer sees a dedicated empty state indicating no stores are available in this area yet.
4. **Given** a customer changes their selected area from Area A to Area B, **When** the change is confirmed, **Then** the catalog query immediately re-filters to display stores for Area B without full app reload.
5. **Given** a customer filters by store type (e.g., "Restaurants" or "Markets"), **When** viewing the selected area, **Then** the type filter applies within the selected area boundary.

---

### User Story 2 - Area Selection Client State & Profile Persistence (Priority: P1)

A customer must be able to select an area immediately without being forced to log in. For unauthenticated guests, their area selection is retained in client-local state throughout their browsing session. When an authenticated customer selects an area, or when a guest logs in after having selected an area, the selection is persisted to their user profile on the server. On subsequent app launches or logins across sessions, the customer's last chosen area is automatically restored, providing a seamless browsing experience.

**Why this priority**: Guarantees frictionless guest exploration per the established guest-browsing foundation, while ensuring authenticated users do not have to re-select their location every time they open the app.

**Independent Test**: Can be tested by selecting an area as a guest, closing and reopening the app in the same session, verifying the selection remains; then logging into an existing customer account, verifying the selection persists to the profile database record, and inspecting profile restoration upon re-login.

**Acceptance Scenarios**:

1. **Given** an unauthenticated guest user opens the app, **When** they select an area, **Then** the selection is stored in client-local state (Redux) and catalog browsing reflects that area immediately without requiring authentication.
2. **Given** an authenticated customer selects an area, **When** the selection changes, **Then** the selected area is updated in client state and persisted to their server profile.
3. **Given** an unauthenticated guest has selected Area X and subsequently signs in or creates an account, **When** authentication completes, **Then** Area X is saved as their profile's preferred area.
4. **Given** an authenticated customer who previously selected Area Y logs into the app on a fresh session, **When** their profile is loaded, **Then** Area Y is restored as the active selected area.
5. **Given** a customer has no previously saved area in client state or profile, **When** they first launch the app, **Then** the app prompts them with the area selection interface or defaults to a designated default region while inviting selection.

---

### User Story 3 - Driver Area-Scoped Available Orders Pool (Priority: P1)

An active driver opens the Available Orders pool to find delivery opportunities. The system retrieves and displays only pending, unclaimed orders from restaurants located within the specific areas explicitly assigned to that driver. Even if an assigned area has child areas in the hierarchy, orders from those child areas are not included unless the driver is also explicitly linked to those child areas. If a driver is assigned to multiple areas, orders from restaurants across all of the driver's assigned areas are aggregated in the pool.

**Why this priority**: Prevents drivers from receiving delivery orders from locations they do not operate in, reducing travel times, vehicle wear, and delivery delays.

**Independent Test**: Can be tested by assigning a test driver to Area A only, creating pending orders in Area A and Area B, and verifying that the driver's pool query returns only the order from Area A. Then assign the driver to Area B as well and verify both orders appear.

**Acceptance Scenarios**:

1. **Given** Driver D is explicitly assigned to Area "Fayoum" and not "Senours", **When** pending orders exist for both Fayoum restaurants and Senours restaurants, **Then** Driver D sees only the pending orders from Fayoum restaurants.
2. **Given** Driver D is explicitly assigned to both "Fayoum" and "Senours", **When** pending orders exist in both areas, **Then** Driver D sees pending orders from restaurants in both areas.
3. **Given** Driver D is assigned to parent Area "Fayoum", **When** an order is created at a restaurant in child area "Senours", **Then** the order does NOT appear in Driver D's pool (strict non-inheritance).
4. **Given** a pending order exists in an assigned area, **When** Driver D views the pool, **Then** existing eligibility filters (driver available, no active delivery, order not expired, order not declined) remain strictly enforced alongside the area filter.
5. **Given** a new pending order is placed at a restaurant in Area A, **When** the serverless notification function (`notify-order-status`) evaluates eligible drivers to notify, **Then** push notifications are dispatched exclusively to available, unbusy drivers assigned to Area A, and no push notifications are sent to drivers assigned only to other areas.

---

### User Story 4 - Safe-Default-Deny Pool Enforcement for Drivers Without Areas (Priority: P1)

A newly provisioned or unassigned driver opens the Available Orders pool. Because the driver has not yet been assigned to any operational area by operations/admin staff, the server-side pool query returns an empty list. The system never falls back to showing all pending orders. The driver interface displays a clear, supportive message explaining that no delivery areas have been assigned to their account yet and advising them to contact dispatch or support.

**Why this priority**: Security and operational integrity. Defaulting to deny prevents unvetted or unassigned drivers from seeing or claiming customer orders across the platform.

**Independent Test**: Can be tested by creating a driver profile with zero assigned areas in `driver_areas` and executing the available orders retrieval; verify that the response is empty (`[]`) at the server level, and the UI presents the "No areas assigned" empty state.

**Acceptance Scenarios**:

1. **Given** an authenticated driver with `is_available = true` has zero rows in `driver_areas`, **When** the driver requests the available orders pool, **Then** the server returns an empty list `[]`.
2. **Given** a driver with zero assigned areas views the pool screen, **When** the screen renders, **Then** an empty state is displayed stating "No areas assigned: contact support to set up your delivery zones".
3. **Given** a driver with zero assigned areas attempts to inspect raw network or RPC responses, **Then** no pending orders from any area are returned in the payload.

---

### User Story 5 - Database RLS and Tamper-Proof Security (Priority: P2)

Area reference data is publicly readable to allow guest and customer browsing. However, area assignments for stores and drivers are strictly administrative and operational data. Non-admin users (customers, guests, and drivers) are prevented from inserting, updating, or deleting rows in `areas`, `driver_areas`, or `restaurants.area_id`. Drivers are permitted to read their own `driver_areas` assignments to know their current coverage, but cannot modify them.

**Why this priority**: Prevents malicious actors or compromised clients from tampering with store assignments or granting drivers unauthorized access to other operational delivery territories.

**Independent Test**: Can be tested by executing client-side Supabase mutation requests (`INSERT`, `UPDATE`, `DELETE`) on `areas`, `driver_areas`, and `restaurants.area_id` using anonymous and authenticated customer/driver JWTs, and verifying that all mutations are rejected by Row Level Security.

**Acceptance Scenarios**:

1. **Given** an anonymous user or authenticated customer, **When** they execute a `SELECT` on `areas`, **Then** the query succeeds and returns the area list.
2. **Given** an authenticated driver, **When** they execute a `SELECT` on `driver_areas`, **Then** they can only view rows where `driver_id = auth.uid()`.
3. **Given** any authenticated user or anonymous client, **When** they attempt to `INSERT`, `UPDATE`, or `DELETE` rows in `areas`, **Then** the operation is rejected by RLS.
4. **Given** any authenticated user or anonymous client, **When** they attempt to `INSERT`, `UPDATE`, or `DELETE` rows in `driver_areas`, **Then** the operation is rejected by RLS.
5. **Given** any client attempts to update `area_id` on `restaurants`, **Then** the operation is rejected by RLS.

---

### User Story 6 - Existing Catalog Backfill and Migration Integrity (Priority: P2)

When the regional dispatch database migration is applied, all existing seeded restaurants in the platform must be backfilled to a valid, real area record rather than leaving their `area_id` as `NULL`. The `area_id` column on `restaurants` is established as mandatory (`NOT NULL`), guaranteeing that no existing store silently vanishes from customer browsing or driver fulfillment upon deployment. Additionally, the migration MUST seed initial test driver assignments (linking standard platform test driver accounts such as `test-driver` and `test-driver2` to the Fayoum region in `driver_areas`); otherwise, due to the safe-default-deny rule, test driver accounts would immediately see an empty available-orders pool post-migration.

**Why this priority**: Operational continuity. Prevents existing partner restaurants and test catalog items from becoming orphaned or invisible in production, and prevents test driver accounts from losing pool visibility.

**Independent Test**: Can be tested by running the database migration against the pre-existing seed data and confirming that every row in `restaurants` has a non-null, valid `area_id` referencing a valid row in `areas`, test drivers have active rows in `driver_areas` for Fayoum, and querying the store list and order pool returns expected items.

**Acceptance Scenarios**:

1. **Given** an existing database with restaurants lacking area associations, **When** the regional dispatch migration runs, **Then** a default/primary area (e.g., "Fayoum") is established and all existing restaurants are backfilled to valid area IDs.
2. **Given** the migration completes, **When** checking the `restaurants` schema constraints, **Then** `area_id` is defined as `NOT NULL` with a foreign key referencing `areas(id)`.
3. **Given** a customer selects the backfilled area in the app, **When** browsing the store catalog, **Then** all pre-existing seeded restaurants appear in the results.
4. **Given** test driver accounts exist in the database (e.g., `test-driver`, `test-driver2`), **When** the regional dispatch migration runs, **Then** the migration seeds explicit assignments for these drivers linking them to the primary Fayoum area in `driver_areas`, allowing immediate verification and end-to-end testing of the order pool.

---

### Edge Cases

- **Area with zero active stores**: When a customer selects an area where no restaurants or markets are currently open or registered, the app must display an empty state explaining that service is coming soon to that area, rather than showing a generic error or spinning indefinitely.
- **Driver assigned to an area with no active orders**: When an assigned driver's areas have no pending orders, the driver sees the standard "No orders available right now" pool empty state.
- **Customer switches area while cart contains items**: The shopping cart belongs to a specific store. Switching the browsing area does not alter or erase the existing cart contents. If the customer subsequently attempts to add an item from a store in the newly selected area, the application's existing single-store cart conflict confirmation prompt is triggered ("Replace cart items?").
- **Area hierarchy with arbitrary depth**: The database structure must support any depth of hierarchy (e.g., Governorate → City → District → Village) without requiring schema changes or hardcoded level assumptions.
- **Deactivated or deleted areas**: Reference areas are soft-managed or preserved; foreign key constraints prevent deleting an area that is referenced by restaurants or driver assignments.
- **Driver pool signals during area filtering**: When an order is created or claimed anywhere on the platform, `driver_pool_signals` emits an event. The driver client refetches `get_available_orders()`. The server evaluates the driver's current assigned areas and returns only relevant orders. No unfiltered data is ever exposed to the client.
- **Offline / Network failure during area switch**: If the customer selects a new area while offline or during a network failure, the client retains the user's intent in local state, displays cached stores if available, or presents a network retry state without crashing.
- **Customer with deleted/invalid saved area**: If an authenticated user's profile references an area ID that no longer exists in `areas`, the application gracefully falls back to the top-level default area or prompts for re-selection.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST represent geographical areas using a self-referencing adjacency-list table (`areas`) with attributes for unique identifier, display name, and optional parent area identifier.
- **FR-002**: System MUST allow arbitrary depth of area hierarchy (e.g., governorate, city, region, village) via the `parent_area_id` relationship without requiring schema alterations.
- **FR-003**: System MUST NOT store or parse area hierarchy as delimited strings.
- **FR-004**: System MUST associate each store (restaurant or market) with exactly one area (`restaurants.area_id`), referencing a valid area identifier.
- **FR-005**: System MUST enforce that `restaurants.area_id` is mandatory (`NOT NULL`) in production, with all existing restaurants backfilled to valid areas during migration, and standard test driver accounts (`test-driver`, `test-driver2`) seeded with explicit assignments to the primary Fayoum area in `driver_areas` to preserve testability and prevent empty test pools.
- **FR-006**: System MUST support an explicit many-to-many relationship between drivers and areas (`driver_areas`) where each association links one driver to one area.
- **FR-007**: System MUST treat driver area assignments as explicit and non-inheriting: an assignment to a parent area MUST NOT grant visibility into child areas, and an assignment to a child area MUST NOT grant visibility into parent areas.
- **FR-008**: System MUST filter the Driver Available Orders pool (`get_available_orders()`) strictly on the server: an order MUST be included ONLY if the order's restaurant `area_id` matches one of the calling driver's explicit assignments in `driver_areas`.
- **FR-009**: System MUST enforce safe-default-deny for driver dispatch: a driver with zero assigned areas MUST receive an empty order pool (`[]`) directly from the server.
- **FR-010**: System MUST NOT modify `driver_pool_signals`, its trigger, `claim_order()`, `release_order()`, or `orders_column_guard` for this feature.
- **FR-011**: System MUST preserve all existing driver pool eligibility rules alongside the area filter, including order status (`pending`), unexpired status (within `pending_order_ttl()`), unassigned status (`driver_id IS NULL`), driver availability (`is_available = true`), driver role verification, no active delivery in progress, and no prior order decline.
- **FR-012**: System MUST provide an area drill-down selection interface for customers that allows selecting a top-level area, optionally drilling down into sub-areas, or explicitly choosing to browse only the selected parent area.
- **FR-013**: System MUST filter customer store browsing by exact match on the single chosen `area_id`; selecting a parent area MUST NOT return stores assigned to child areas, and selecting a child area MUST NOT return stores assigned to parent areas.
- **FR-014**: System MUST store the currently selected area in client-local state (Redux Toolkit) so that unauthenticated guest customers can select an area and browse stores without logging in.
- **FR-015**: System MUST persist the selected area to the user's profile (`profiles`) upon selection for authenticated customers, and automatically sync it to client-local state upon login.
- **FR-016**: System MUST automatically save the guest's active area selection to their newly authenticated profile when a guest registers or logs in.
- **FR-017**: System MUST display an indicator of the currently selected area on the customer home screen with a one-tap action to change the selected area.
- **FR-018**: System MUST display a dedicated empty state on the customer home screen when no stores are available in the selected area.
- **FR-019**: System MUST display a dedicated empty state on the driver available orders screen when the driver has no assigned areas.
- **FR-020**: System MUST configure Row Level Security (RLS) on `areas` to permit public `SELECT` access for all users (including unauthenticated/anonymous clients) and deny all client-initiated `INSERT`, `UPDATE`, and `DELETE` operations.
- **FR-021**: System MUST configure RLS on `driver_areas` to allow drivers to `SELECT` their own assignment rows (`driver_id = auth.uid()`) and deny all client-initiated `INSERT`, `UPDATE`, and `DELETE` operations.
- **FR-022**: System MUST NOT provide in-app or client-facing write interfaces for assigning restaurants to areas or drivers to areas in this MVP (assignments remain strictly administrative via SQL/Supabase dashboard).
- **FR-023**: System MUST NOT use GPS, geolocation, or device location services for automatic area detection or store matching in this MVP.
- **FR-024**: System MUST NOT calculate delivery radii, distance matrices, or variable delivery fees based on areas in this MVP.
- **FR-025**: System MUST NOT alter existing order placement, checkout, single-store cart validation, coupon validation, or promotion logic.
- **FR-026**: System MUST scope new order push notifications in the serverless notification function (`notify-order-status`) using the same `driver_areas` regional boundary: when querying eligible drivers to notify for a newly placed pending order, push notifications MUST be dispatched exclusively to available, unbusy drivers whose explicit `driver_areas` assignments match the order's restaurant `area_id`.

---

### Key Entities *(include if feature involves data)*

- **Area (`areas`)**:
  - `id`: Unique identifier (UUID).
  - `name`: Human-readable name of the area (e.g., "Fayoum", "Senours", "Itsa") in Arabic/English.
  - `parent_area_id`: Optional self-referencing identifier linking to a parent `Area`. When `null`, represents a top-level area (e.g., governorate).
  - `created_at`: Creation timestamp.
  - *Relationship*: Self-referencing tree; one-to-many with `restaurants`; many-to-many with `driver_profiles` via `driver_areas`.

- **Driver Area Assignment (`driver_areas`)**:
  - `driver_id`: Identifier referencing `driver_profiles.user_id` / `auth.users.id`.
  - `area_id`: Identifier referencing `areas.id`.
  - `created_at`: Assignment timestamp.
  - *Primary Key*: Composite `(driver_id, area_id)`.
  - *Relationship*: Explicit link granting a driver visibility into orders originating from restaurants in the specified `Area`.

- **Store Area Association (`restaurants.area_id`)**:
  - `area_id`: Foreign key on the existing `restaurants` table referencing `areas.id`.
  - Mandatory (`NOT NULL`) after migration. Indicates the specific physical/administrative area where the store is located.

- **Customer Profile Area Preference (`profiles.selected_area_id`)**:
  - `selected_area_id`: Optional foreign key on the `profiles` table referencing `areas.id`.
  - Stores the customer's persisted preference for cross-session and cross-device restoration.

- **Client Area State (`areaSlice` in Redux Toolkit)**:
  - `selectedAreaId`: The currently active area identifier (string or null).
  - `selectedAreaName`: The display name of the currently active area (string or null).
  - Transient client-side single source of truth for UI filtering and guest sessions.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of customer catalog queries filter stores strictly to the selected area ID; 0% of stores from outside the selected area appear in the results.
- **SC-002**: 100% of driver available order queries return exclusively orders originating from restaurants in the driver's assigned areas; 0% leakage of orders from unassigned areas.
- **SC-003**: 100% of drivers with zero assigned areas receive an empty order pool (`[]`) on both initial fetch and real-time refetch.
- **SC-004**: 100% of pre-existing seeded restaurants remain visible and discoverable post-migration with valid area assignments.
- **SC-005**: 100% of unauthorized client write attempts (`INSERT`, `UPDATE`, `DELETE`) to `areas`, `driver_areas`, and `restaurants.area_id` are blocked by Row Level Security.
- **SC-006**: Changing the selected area updates the visible store catalog within 1.0 second under normal network conditions.
- **SC-007**: 100% of guest customers can select an area, navigate the catalog, and have that area preference preserved upon account creation/login.
- **SC-008**: 0% regression on existing order fulfillment mechanics: `claim_order()`, `release_order()`, order expiration, and active delivery tracking continue to operate with 100% compliance with existing business rules.
- **SC-009**: 100% of new order push notifications dispatched by the edge function reach only drivers with active assignments to the order's restaurant area, with 0% notification leakage to other regions.

---

## Assumptions

- **Administrative Provisioning**: Management of areas, restaurant area assignments, and driver area assignments will be handled via SQL migrations or direct Supabase Dashboard operations for this MVP. No merchant portal or admin dashboard UI is required or expected.
- **Hierarchical Semantics**: The hierarchical `parent_area_id` relationship exists solely to power drill-down navigation in the UI (e.g., selecting a governorate then choosing a city). Exact matching (`area_id = chosen_area_id`) is used for all store and order filtering; no parent-inclusive or recursive rollups will be performed.
- **Single Area per Store**: Each restaurant or market belongs to exactly one physical area (represented by a single `area_id` foreign key). Multi-branch stores are represented as separate store records if located in different areas.
- **No Geolocation/GPS**: Geolocation detection, GPS coordinates, distance calculations, and delivery radius bounding are explicitly excluded from this feature and will not be introduced.
- **Cart Independence**: The cart remains tied to a single store. Changing the selected area in the browsing UI filters the store list but does not clear the cart. If a customer adds an item from another store, existing cart replacement confirmation rules apply.
- **Backfill & Test Driver Seeding Strategy**: All existing stores in the database will be assigned to a designated default area (e.g., Fayoum city center) during migration, ensuring no existing test or seed data becomes inaccessible. Furthermore, standard test driver accounts (`test-driver` and `test-driver2`) will be seeded with explicit assignments to the primary Fayoum area during migration, preventing them from being blocked by the safe-default-deny rule immediately after migration.
- **Safe-Default-Deny**: A driver with no assigned areas is intentionally treated as inactive for order dispatch, seeing zero orders until an administrator links them to at least one area.
