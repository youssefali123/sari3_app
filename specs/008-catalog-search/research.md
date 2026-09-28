# Research: Unified Catalog Search (008)

**Feature**: `008-catalog-search`
**Date**: 2026-09-27
**Purpose**: Resolve all technical unknowns before Phase 1 design

---

## D-001: pg_trgm Extension Status

**Decision**: `pg_trgm` is NOT yet enabled via a migration in this project — no existing migration calls `CREATE EXTENSION IF NOT EXISTS pg_trgm`. A migration must enable it.

**Rationale**: Grepping all migration files in `supabase/migrations/` returns zero hits for `pg_trgm`. The extension is a standard bundled Postgres/Supabase extension (same tier as `pg_cron` and `pg_net`) so enabling it requires only a `CREATE EXTENSION` call — no installation or external tooling needed.

**Action**: The catalog-search migration (`20260927000001_catalog_search.sql`) MUST include:
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```
as its first statement.

**Alternatives considered**: Assuming it is already enabled — rejected because no evidence exists in the migration history and a missing extension causes a hard runtime error on index creation.

---

## D-002: No Existing Search Stub on Home Screen

**Decision**: There is no existing search `TextInput` or `SearchBar` stub in the Home screen (`src/app/(customer)/(home)/index.tsx`). Searching the file and all source files for "search" / "SearchBar" returns zero results. The `src/features/search/` directory does not exist.

**Rationale**: A full grep of the source tree confirmed absence. The spec's assumption A-004 said "if no stub exists, the search input will be added as part of this feature's presentation work."

**Action**: `SearchBar.tsx` and the hook-up to `FlatList`'s `ListHeaderComponent` in `index.tsx` are both in scope for this feature's implementation.

---

## D-003: Trigram Similarity Threshold and Result Cap

**Decision**:
- Minimum similarity threshold: **0.15** (using `word_similarity()`)
- Result cap: **20 rows** total (stores + products combined)

**Rationale**:
- `word_similarity()` is preferred over `similarity()` for partial-word matching — crucial for users typing partial Arabic or product names (e.g., searching "بيتز" should match "بيتزا"). `similarity()` compares entire strings and produces very low scores for short substrings.
- Threshold 0.15: Low enough to allow prefix/partial matches typical in a search-as-you-type flow, high enough to exclude clearly irrelevant noise. This is a well-established starting point for trigram search in food delivery apps; can be tuned post-launch via the RPC parameter without a migration.
- Cap of 20: Balances response payload size, mobile scroll ergonomics, and RPC computation time. Consistent with standard mobile list lengths in the app (promotions, stores).

**Alternatives considered**:
- `similarity()` only: rejected because short queries (2-4 chars) score too low for substrings.
- Threshold 0.3: Too strict — common Arabic partial words fail to match. Rejected.
- Cap of 50: Excessive for MVP; rejected for payload and UX reasons.

---

## D-004: Debounce Interval and Minimum Query Length

**Decision**:
- Debounce interval: **300 ms**
- Minimum query length: **2 non-whitespace characters** (matching FR-002)

**Rationale**:
- 300ms is the standard mobile search-as-you-type debounce — fast enough to feel responsive, slow enough to avoid firing a query on every keystroke for fast typists.
- 2 characters: consistent with FR-002 and common mobile search UX. Single-character queries on trigram indexes produce too many matches and are not useful for scoped results.

**Alternatives considered**:
- 500ms: Noticeably sluggish on fast connections. Rejected.
- 1 character minimum: Excessive results, high server load. Rejected.

---

## D-005: Feature Directory Placement (`search` vs. collocating with `restaurants`)

**Decision**: A new `src/features/search/` feature directory is created — not placed inside `restaurants/` or `products/`.

**Rationale**:
- Search spans both the `restaurants` and `products` domains. Placing it in either would create an upward dependency (the host feature depending on the other).
- The `areas` feature (`src/features/areas/`) establishes the project precedent: cross-cutting concerns that span multiple business domains receive their own feature directory.
- Consistent with Constitution Principle I (Screaming Architecture): `search/` is a clear business capability name.

**Alternatives considered**:
- Inside `restaurants/`: rejected — products are a peer concern, not subordinate to restaurants.
- Inside a shared `shared/` directory: rejected — `shared/` is for truly generic utilities, not business-capability features with their own domain types.

---

## D-006: RPC Return Shape

**Decision**: `search_catalog` returns `SETOF` rows with the following columns per row:

| Column | Type | Description |
|---|---|---|
| `result_type` | `text` (`'store'` \| `'product'`) | Discriminator |
| `id` | `uuid` | Store id or Product id |
| `name` | `text` | Store name or product name |
| `image_url` | `text \| null` | Cover image |
| `similarity_score` | `float4` | `word_similarity(query, name)` |
| `store_id` | `uuid \| null` | Parent store id (products only; null for stores) |
| `store_name` | `text \| null` | Parent store name (products only; null for stores) |
| `is_open` | `boolean \| null` | Store open/closed flag (stores only; null for products) |

**Rationale**:
- `SETOF` (vs. `JSONB` aggregate): easier to type on the client, leverages Supabase auto-typed RPC calls, avoids an extra JSON parse step.
- Null-for-irrelevant-type columns preserve a flat return shape without nested objects, keeping the SQL simple and the client mapper straightforward.
- `similarity_score` exposed so the client can optionally show relevance or debug ordering; the ORDER BY is still server-authoritative.

**Alternatives considered**:
- `RETURNS JSONB` aggregate (array): rejected — adds a JSON parse step and loses Supabase's type generation.
- Two separate columns for image (store_image_url, product_image_url): rejected as redundant; a single `image_url` covers both.

---

## D-007: No-Area-Selected Behavior (Reuse Home Screen Pattern)

**Decision**: When `selectedAreaId` is `null` (no area selected), the search hook returns an empty array immediately without calling the RPC. The search screen renders the same "select an area first" state that the Home screen renders (reuse `AreaEmptyState` component).

**Rationale**:
- FR-014 and spec Scenario 8: search must behave consistently with the Home screen's no-area-selected state. The Home screen currently renders `<AreaEmptyState>` when `selectedAreaId` is null (verified via code inspection).
- Calling the RPC with a null `area_id` would be an error or would return unconstrained cross-area results — both wrong.

**Alternatives considered**:
- Pass a hardcoded fallback area: rejected — violates the exact-match area semantics of feature 006.
- Show a special "search is unavailable" message: rejected — duplicating the existing empty state is unnecessary complexity (Constitution Principle X).

---

## D-008: Existing Closed-Store Handling

**Decision**: `search_catalog` does NOT filter out closed stores. Client renders them as-is.

**Rationale**:
- FR-011 and spec Scenario 6: closed stores MUST appear in search results.
- `SupabaseStoreRepository.getStores()` (existing) does not filter by `is_open` — it returns all stores including closed ones, with `is_open` exposed on the entity.
- The store-detail screen and `StoreCard` component already handle the closed state (FR-024 from feature 001).
- `is_open` is included in the RPC return shape (D-006) so `StoreResultRow` can show the same closed indicator.

**Alternatives considered**:
- Filter closed stores in RPC: rejected — directly contradicts FR-011 and breaks behavioral consistency.
