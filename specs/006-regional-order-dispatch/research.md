# Research: Regional Order Dispatch & Store Browsing

**Feature Branch**: `006-regional-order-dispatch`  
**Date**: 2026-09-26  
**Spec**: [spec.md](./spec.md)

---

## 1. Geographical Area Data Structure & Hierarchy

### Decision
Store areas in a dedicated PostgreSQL table `public.areas` using an **adjacency-list pattern**:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `name TEXT NOT NULL`
- `parent_area_id UUID REFERENCES public.areas(id) ON DELETE RESTRICT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Rationale
- Supports arbitrary hierarchy depth (Governorate → City → District → Village) cleanly without schema alterations.
- An adjacency-list with `ON DELETE RESTRICT` guarantees referential integrity and prevents accidental cascading deletion of active operational zones.
- Keeps area records lightweight, queryable, and indexable.

### Alternatives Considered
- **Delimited strings (e.g., `"fayoum-senours"`)**: Explicitly rejected in feature requirements. Fragile, breaks on special characters or dashes in names, impossible to index reliably, and fails to handle arbitrary depths beyond two levels.
- **Materialized Path (e.g., `ltree` extension)**: Premature generalization. The hierarchy is used *only* for the UI drill-down picker, not for path-based matching or tree queries. Adjacency list is standard PostgreSQL without requiring third-party extensions.
- **Nested Set**: Too complex for write updates (re-indexing tree bounds) with zero benefit for our simple parent/child drill-down UI.

---

## 2. Store and Order Matching Semantics (Exact Match vs. Rollup)

### Decision
Matching a customer's selected area to stores, or matching a driver's assigned areas to orders, is **always an exact `area_id` equality match**:
- Customer catalog query: `WHERE r.area_id = :selected_area_id`
- Driver available orders query: `WHERE r.area_id IN (SELECT area_id FROM public.driver_areas WHERE driver_id = auth.uid())`
- There is **no recursive CTE** and **no parent-inclusive expansion** in any query.

### Rationale
- Product requirement is strict: Fayoum has its own stores (A, B) and Senours has its own stores (C, D). A customer selecting "Fayoum" must see only stores physically in Fayoum (A, B), never stores in Senours, even though Senours is a sub-district of Fayoum Governorate.
- Drivers are licensed or operate within specific towns/cities. A driver covering Fayoum city does not automatically cover Senours village 15km away unless explicitly assigned to Senours.
- Exact matching eliminates heavy recursive SQL queries, maintains high query performance ($O(1)$ indexed lookup), and simplifies caching.

### Alternatives Considered
- **Recursive / Rollup Matching**: Selecting a parent area returns stores from that parent plus all child areas. Rejected because stores in distant sub-areas cannot fulfill orders in the capital city, and drivers assigned to the capital cannot deliver orders originating in remote villages.

---

## 3. Driver Area Assignments & Non-Inheritance

### Decision
Implement driver assignments via an explicit junction table `public.driver_areas`:
- `driver_id UUID NOT NULL REFERENCES public.driver_profiles(user_id) ON DELETE CASCADE`
- `area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE RESTRICT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Composite Primary Key: `(driver_id, area_id)`

Driver coverage is explicit and non-inheriting. A driver covering multiple areas has multiple rows.

### Rationale
- Many-to-many relationship allows a driver to operate in multiple distinct zones (e.g. Fayoum City + Senours).
- Enforces strict non-inheritance without needing complex graph traversal.
- Enables safe-default-deny: if a driver has zero rows in `driver_areas`, the join/subquery matches zero orders, naturally yielding an empty order pool.

### Alternatives Considered
- **Single `assigned_area_id` on `driver_profiles`**: Restricts a driver to exactly one area. Rejected because drivers frequently cover adjacent sister towns.
- **Role/Group inheritance table**: Premature optimization for MVP. Explicit rows in `driver_areas` provide complete control and transparency.

---

## 4. Driver Available Orders Pool Query (`get_available_orders`)

### Decision
Extend the existing `public.get_available_orders()` `SECURITY DEFINER` function with an additive condition:
```sql
AND EXISTS (
  SELECT 1 FROM public.driver_areas da
  WHERE da.driver_id = auth.uid()
    AND da.area_id = r.area_id
)
```
Preserves all existing pool checks:
- `o.status = 'pending'`
- `o.driver_id IS NULL`
- `o.created_at >= (now() - pending_order_ttl())`
- `is_available = true`
- Active delivery check (`COUNT = 0`)
- Decline exclusion (`NOT EXISTS in driver_order_interactions`)

### Rationale
- Enforces safe-default-deny at the database level (Principle V). If the driver has no rows in `driver_areas`, `EXISTS` evaluates to `false` and the query returns `'[]'::jsonb`.
- Tamper-proof: client cannot manipulate headers or parameters to see cross-area orders.
- Does not modify `driver_pool_signals` or the pool signal triggers (the trigger notifies that "something changed", and the client refetches via the secure RPC).

### Alternatives Considered
- **Client-side area filtering**: Client fetches all pending orders and filters locally. Rejected: massive security violation (leaks store addresses and order volume from other regions to unauthorized drivers).

---

## 5. Serverless Push Notification Dispatch (`notify-order-status`)

### Decision
Update `supabase/functions/notify-order-status/index.ts` in step 4b (new pending order pool alert) to scope driver token queries by the order's restaurant `area_id`:
1. Fetch `restaurant.area_id` along with `restaurant.address` from `public.restaurants`.
2. Query `driver_areas` for all `driver_id`s where `area_id = restaurant.area_id`.
3. Intersect this set with eligible drivers (has role `driver`, `is_available = true`, no active delivery).
4. Fetch active device tokens only for drivers in this intersected set.

### Rationale
- Prevents notification spam to drivers operating in distant regions.
- Aligns push notification dispatch with the exact visibility rules of `get_available_orders()`.
- Guarantees 0% notification leakage across regional boundaries (SC-009).

### Alternatives Considered
- **Broadcast to all available drivers**: Rejected because drivers in Senours would receive push notifications for orders in Fayoum that they cannot fulfill and cannot see in their pool.

---

## 6. Customer Area Selection State Architecture

### Decision
Adopt a **dual-layer state model**:
1. **Client-Local State (Redux Toolkit `areaSlice`)**:
   - Stores `selectedAreaId: string | null` and `selectedAreaName: string | null`.
   - Single source of truth for the active browsing session. Allows unauthenticated guest browsing without login friction.
2. **Server-Side Persistence (`public.profiles.selected_area_id`)**:
   - `ALTER TABLE public.profiles ADD COLUMN selected_area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL;`
   - When an authenticated customer selects an area, update Redux AND call `SupabaseProfileRepository.updateProfile({ selectedAreaId })`.
   - When an unauthenticated guest logs in or signs up, persist the guest's active Redux `selectedAreaId` to their new profile.
   - When an authenticated customer logs into a new device/session, load `profile.selected_area_id` and initialize `areaSlice`.
3. **Server State (TanStack Query)**:
   - Queries `['stores', 'home', selectedAreaId, typeFilter]` via `SupabaseStoreRepository.getStores(type, selectedAreaId)`.
   - Changing `selectedAreaId` in Redux triggers an immediate query refetch.

### Rationale
- Follows Constitution Principle IV: Redux owns client-local UI state (selected preference), TanStack Query owns server state (store list), and `profiles` stores persistent user profile data.
- Satisfies requirements for seamless guest exploration without mandatory authentication.

### Alternatives Considered
- **AsyncStorage only**: Bypasses Redux and creates divergent state management patterns across the codebase.
- **TanStack Query for selected area**: Selected area is a user preference and input filter, not a server resource being queried. Redux Toolkit is the established pattern for client state in Sari3 (alongside `cartSlice`).

---

## 7. Catalog Migration, Backfill & Test Driver Provisioning

### Decision
Structure the database migration in strict sequence:
1. `CREATE TABLE public.areas ...` with RLS.
2. Seed initial reference areas:
   - Fayoum (Parent, e.g. `20000000-0000-0000-0000-000000000001`)
   - Senours (Child of Fayoum, e.g. `20000000-0000-0000-0000-000000000002`)
   - Itsa (Child of Fayoum, e.g. `20000000-0000-0000-0000-000000000003`)
3. `ALTER TABLE public.restaurants ADD COLUMN area_id UUID REFERENCES public.areas(id);`
4. Backfill all existing rows in `public.restaurants` to the Fayoum seed area ID.
5. `ALTER TABLE public.restaurants ALTER COLUMN area_id SET NOT NULL;`
6. `CREATE TABLE public.driver_areas ...` with composite PK and RLS.
7. Seed test driver assignments: insert `(user_id, fayoum_area_id)` into `driver_areas` for test drivers (`driver@sari3.test`, `test-driver`, `test-driver2`).
8. `ALTER TABLE public.profiles ADD COLUMN selected_area_id UUID REFERENCES public.areas(id);`
9. Replace `get_available_orders()` with the area filter.

### Rationale
- Backfilling restaurants *before* applying `SET NOT NULL` prevents migration failures on databases with existing seed data.
- Seeding test drivers into Fayoum prevents test accounts from being locked out of the order pool immediately after migration.

### Alternatives Considered
- **Leaving `restaurants.area_id` nullable**: Rejected. A null area restaurant would become permanently invisible to area-filtered queries. Making it `NOT NULL` guarantees data integrity.

---

## 8. Feature Layering & Architectural Placement

### Decision
Place the Area capability into a dedicated feature module: `src/features/areas/`:
- **Domain**:
  - `src/features/areas/domain/entities/Area.ts`: `interface Area { id: string; name: string; parentAreaId: string | null; createdAt: string; }`
  - `src/features/areas/domain/repositories/AreaRepository.ts`: `getAreas(): Promise<Area[]>`
- **Infrastructure**:
  - `src/features/areas/infrastructure/SupabaseAreaRepository.ts`: queries `public.areas` ordered by `name`.
- **Application**:
  - `src/features/areas/application/areaSlice.ts`: Redux slice for `selectedAreaId` and `selectedAreaName`.
  - `src/features/areas/application/hooks/useAreas.ts`: TanStack Query hook for fetching reference areas.
  - `src/features/areas/application/hooks/useSelectedArea.ts`: helper hook connecting Redux state and Profile persistence.
- **Presentation**:
  - `src/features/areas/presentation/AreaPickerModal.tsx`: drill-down modal supporting top-level selection, child drill-down, and "Parent only" selection.
  - `src/features/areas/presentation/AreaHeaderChip.tsx`: clickable chip on HomeScreen showing the current area name.

### Rationale
- Respects Principle I (Feature-First Screaming Architecture) and Principle II (Lightweight Clean Architecture).
- Keeps store browsing (`src/features/restaurants/`) and driver fulfillment (`src/features/drivers/`) decoupled from area fetching logic.

---

## Summary of Decisions

| Topic | Resolution |
| :--- | :--- |
| **Area Hierarchy** | Adjacency-list table `public.areas` (`parent_area_id`), public read-only RLS |
| **Matching Logic** | Exact match on `area_id` across store catalog and driver pool queries (no recursive CTE) |
| **Driver Coverage** | Many-to-many junction table `public.driver_areas`, non-inheriting |
| **Dispatch Security** | Server-side safe-default-deny inside `get_available_orders()` |
| **Push Notifications** | `notify-order-status` filters available drivers by `driver_areas.area_id = order.restaurant.area_id` |
| **Client State** | Redux Toolkit `areaSlice` for guest sessions + `profiles.selected_area_id` for logged-in users |
| **Data Integrity** | `restaurants.area_id` is `NOT NULL` with atomic seed backfill; test drivers seeded to Fayoum |
| **Layer Placement** | New feature module `src/features/areas/` following Screaming Clean Architecture |
