# Feature Specification: Unified Catalog Search

**Feature Branch**: `008-catalog-search`

**Created**: 2026-09-27

**Status**: Draft

**Input**: User description: "unified search feature — single search box returning both matching stores and products in one ranked result list, scoped to the customer's selected area, using pg_trgm, with a dedicated product/[id] route for product navigation"

---

## Clarifications

### Session 2026-09-27

- Q: Should search results exclude unavailable products while still showing products from closed stores? → A: Show everything matching — unavailable products and closed-store products both appear; the client renders them in disabled states consistent with existing browsing behavior.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Unified Store + Product Search (Priority: P1)

As a customer (or unauthenticated guest) with an area selected, I want to type a search term and immediately see a ranked list of matching stores AND matching products from my area in a single results view, so I can quickly find what I want without switching tabs or screens.

**Why this priority**: This is the entire value proposition of the feature. Without it nothing else matters.

**Independent Test**: Open the app, select an area, tap the search box, type 2+ characters, and verify that both store results and product results appear in one combined ranked list — before any navigation is tested.

**Acceptance Scenarios**:

1. **Given** a customer has area "Fayoum" selected, **When** they type a term that matches a store name AND a product name both in Fayoum, **Then** both appear in one combined list ranked by similarity score (no tabs, no separate screens).
2. **Given** a customer has area "Fayoum" selected, **When** they type a term matching only a product name in Fayoum, **Then** only that product result appears — no irrelevant results from other areas.
3. **Given** a customer has area "Fayoum" selected and a store/product with the same name exists in "Senours", **When** the customer searches that term, **Then** the Senours result does NOT appear.
4. **Given** the customer types fewer than 2 characters, **Then** no RPC call is made and no results list is shown (input idle state).
5. **Given** the search term matches nothing in the selected area, **Then** a clear empty-results state is shown — not a blank screen or an error.

---

### User Story 2 — Guest (Unauthenticated) Search (Priority: P2)

As an unauthenticated guest who has selected an area, I want to search the catalog without being prompted to log in, so I can browse without friction.

**Why this priority**: Guest browsing is a first-class requirement for the Sari3 app. Blocking search behind auth would contradict the existing product behavior.

**Independent Test**: Use the app without logging in, select an area, open search, type a term, and confirm results appear normally — without any auth prompt or error.

**Acceptance Scenarios**:

1. **Given** the user is not authenticated and has selected an area, **When** they perform a search, **Then** results return normally and no login prompt appears.
2. **Given** the user is not authenticated and has NOT selected an area, **When** they open the search screen, **Then** search behaves exactly the same way the Home screen already handles the no-area-selected state (reuse, do not invent new behavior).

---

### User Story 3 — Product Result Navigation (Priority: P2)

As a customer, when I tap a product result, I want to land directly on that product's dedicated detail screen, so I can see details and add it to my cart — the same experience as tapping that product from store browsing.

**Why this priority**: Without correct navigation the search feature is incomplete and potentially misleading (a dead-end tap).

**Independent Test**: Search a product name, tap the product result, and verify the dedicated product detail screen opens — identical to tapping the same product from store browsing.

**Acceptance Scenarios**:

1. **Given** a customer taps a product search result, **When** navigation occurs, **Then** the app navigates directly to the dedicated product detail screen using the product's id — the same screen used by store browsing and other product entry points in the app.
2. **Given** a customer taps a store search result, **When** navigation occurs, **Then** the app navigates to that store's existing store-detail screen, unchanged.

---

### User Story 4 — Closed-Store Results (Priority: P3)

As a customer searching for a store that is currently closed, I want the store to still appear in search results (with ordering disabled), consistent with how normal browsing already works.

**Why this priority**: Behavioral consistency with existing catalog browsing (FR-024 from catalog-checkout-foundation). Hiding closed stores in search would be an inconsistency that could confuse users.

**Independent Test**: Find a store that is currently closed, search for its name, and verify it appears in results — with ordering unavailable — matching what the store-detail screen shows.

**Acceptance Scenarios**:

1. **Given** a search term matches a currently closed store in the selected area, **Then** that store appears in results (not hidden), consistent with the closed-store display behavior already in the app.

---

### Edge Cases

- What happens when the customer has not yet selected an area? → Search must behave exactly as the Home screen handles the no-area-selected state (inspect and reuse; do not invent new behavior).
- What happens when the search term is fewer than 2 characters? → No RPC call is issued; the results list is not shown (client-side guard).
- What happens when the RPC returns an error (network or server)? → A user-friendly error state is shown, matching the error-handling pattern used elsewhere in the app.
- What happens when a product result's id no longer exists? → Navigation sends the id to the product detail screen; that screen's existing missing-product handling takes over — search does not duplicate this logic.
- What happens when the search term contains only whitespace? → Treated as empty; no query is fired.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose a search entry point (search box) on the Home screen that is accessible without authentication.
- **FR-002**: The system MUST require a minimum of 2 non-whitespace characters before issuing a search query to the server, to prevent excessive calls while the user is still typing.
- **FR-003**: The system MUST debounce user input before issuing a server query, so that rapid keystrokes do not trigger a query per keystroke.
- **FR-004**: The system MUST execute search via a single server-side RPC (`search_catalog`) that internally unions ranked store matches and ranked product matches, sorts the combined set by similarity score, and returns a capped number of results — all in one call. The client must NOT issue two separate queries and merge them.
- **FR-005**: The `search_catalog` RPC MUST accept the customer's current `area_id` and a query string, and MUST filter results to only stores and products belonging to that exact area — using the same exact-match area semantics established in feature `006-regional-order-dispatch` (no parent/child roll-up, no recursive expansion).
- **FR-006**: The `search_catalog` RPC MUST use trigram similarity matching (via the `pg_trgm` Postgres extension) for both store name and product name matching — NOT native `tsvector`/`to_tsquery` full-text search, which has no Arabic stemming dictionary.
- **FR-007**: The `search_catalog` RPC MUST rank combined results by similarity score and apply a minimum similarity threshold so that irrelevant or unrelated results are excluded (not just the nearest match alphabetically).
- **FR-008**: Each result row returned by `search_catalog` MUST carry sufficient data to render either a store-style or product-style row: name, image URL, result type discriminator (`store` | `product`), and — for product results — the parent store's id and name (for routing to the product detail screen).
- **FR-009**: Tapping a product result MUST navigate the customer to the dedicated product detail screen (identified by the product's id) — the same screen reachable from store browsing. The system MUST NOT navigate to the parent store screen or open any modal.
- **FR-010**: Tapping a store result MUST navigate the customer to that store's existing store-detail screen, unchanged.
- **FR-011**: A store that is currently closed MUST appear in search results (not be hidden), consistent with existing closed-store display behavior (FR-024 from `001-catalog-checkout-foundation`). Ordering from a closed store remains disabled as usual.
- **FR-012**: Search MUST work for unauthenticated (guest) users, with no additional RLS restrictions beyond what already applies to public reads on restaurants and products.
- **FR-013**: When the search term matches no records in the selected area, the system MUST display a clear empty-results state, following the same empty-state pattern already used elsewhere in the app.
- **FR-014**: When the customer has not yet selected an area, search MUST behave consistently with how the Home screen already handles the no-area-selected state — no new or different behavior.
- **FR-015**: The system MUST NOT introduce external search infrastructure (Algolia, Meilisearch, Typesense, or any other external service). Only existing Postgres/Supabase capabilities are permitted.
- **FR-016**: Search results MUST NOT include stores or products from areas other than the customer's currently selected area.
- **FR-017**: The two GIN trigram indexes (`restaurants.name`, `products.name`) required by `pg_trgm` MUST be added via migration if not already present.
- **FR-018**: The `pg_trgm` extension MUST be enabled on the database. If it is already enabled (confirmed live before planning), a new migration to enable it is not required.
- **FR-019**: Search results MUST include unavailable products (`is_available = false`) and products belonging to closed stores whenever they match the query — nothing matching is hidden for availability reasons. The client MUST render such rows in disabled states consistent with existing catalog browsing behavior (ordering remains disabled as usual).

### Key Entities

- **SearchResult** (discriminated union): Represents one result from `search_catalog`. Discriminator field: `type` (`'store'` | `'product'`). Common fields: `id`, `name`, `image_url`, `similarity_score`. Product-only fields: `store_id`, `store_name`. Store-only fields: `is_open`.
- **SearchQuery**: The customer's typed input string (minimum 2 non-whitespace characters, debounced before being sent to the server).
- **Area** (existing entity from `006-regional-order-dispatch`): Determines result scope via `area_id`. Exact-match only; no roll-up.
- **Restaurant** (existing entity): Matched by store name via trigram similarity; filtered by `area_id`.
- **Product** (existing entity): Matched by product name via trigram similarity; joined to its parent restaurant for `area_id` filtering and navigation data.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers can see combined search results (stores + products) in a single ranked list within 2 seconds of typing a 2-character query on a standard mobile connection.
- **SC-002**: Search results never include stores or products outside the customer's selected area — 0% area leakage, verifiable by scenario 2 in User Story 1.
- **SC-003**: Unauthenticated guests can complete a full search flow (open search, type, see results, tap result, navigate) without any login prompt — 100% of the time.
- **SC-004**: Tapping a product result always lands on the correct dedicated product detail screen (same screen as tapping from store browsing) — 100% of the time, verifiable by User Story 3 scenario 1.
- **SC-005**: Closed stores that match a search term appear in results and are not hidden — 100% of the time, verifiable by User Story 4 scenario 1.
- **SC-006**: An empty-results state is shown whenever a query returns zero matches — 100% of the time (no blank screen, no crash).
- **SC-007**: The search feature introduces zero new external service dependencies — verifiable by reviewing the dependency graph.

---

## Assumptions

- **A-001**: `pg_trgm` is likely already enabled on the Supabase project (same category as `pg_cron` and `pg_net` already active). This MUST be confirmed live before planning proceeds; if not enabled, a migration to enable it is required.
- **A-002**: The `restaurants` and `products` tables already have an `area_id` column (established in `006-regional-order-dispatch`). No schema change is needed for area scoping.
- **A-003**: The dedicated product detail screen (`product/[id].tsx`) already exists as a completed feature (`007-product-detail-screen`) and is the authoritative navigation target for any product entry point in the app. `AddOnSelectorModal` no longer exists as a navigation pattern.
- **A-004**: The Home screen already has a stub or placeholder search input that this feature will wire up. If no stub exists, the search input will be added as part of this feature's presentation work.
- **A-005**: Search history, recent searches, voice search, category-name matching, and typo-correction beyond trigram similarity are all out of scope.
- **A-006**: The result cap returned by `search_catalog` (e.g., 20 results) and the minimum similarity threshold will be determined during planning based on trigram behavior and the existing data size.
- **A-007**: The debounce interval (e.g., 300ms) will be determined during planning based on typical mobile UX conventions for this type of app.
- **A-008**: No search-specific analytics, trending terms, or server-side logging are required for this feature.
- **A-009**: The `search` feature will be implemented as its own lightweight feature directory (`src/features/search/`) — a new feature separate from `restaurants` and `products` — justified by the cross-cutting nature of unified results that span both domains. This placement decision must be confirmed during planning.
- **A-010**: Public RLS on `restaurants` and `products` already allows unauthenticated reads for active/available records. No new RLS policies are needed for search.
