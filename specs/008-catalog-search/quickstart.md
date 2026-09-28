# Quickstart Validation Guide: Unified Catalog Search (008)

**Feature**: `008-catalog-search`
**Date**: 2026-09-27

---

## Prerequisites

1. Migration `20260927000001_catalog_search.sql` applied to the Supabase project.
2. At least one store (`restaurants`) and one product (`products`) exist in the test area (Fayoum, `area_id = '20000000-0000-0000-0000-000000000001'`).
3. The test area "Senours" (`area_id = '20000000-0000-0000-0000-000000000002'`) has at least one store or product with a name identical or similar to one in Fayoum (for scenario 2).
4. One store in Fayoum has `is_open = false`.
5. Expo development server running (`npx expo start`).

---

## Scenario 1 — Unified Store + Product Results

**Goal**: A query matching both a store name and a product name returns both in one ranked list.

**Steps**:
1. Open the app. Select area "Fayoum."
2. Tap the search box on the Home screen.
3. Type a term (≥ 2 characters) that partially matches both a known store name and a known product name in Fayoum (e.g., the store is named "مطعم الفيوم" and a product is named "بيتزا الفيوم").
4. Wait for results (within 2 seconds).

**Expected**: A single combined list appears. Items with `type = 'store'` render with the store-style row. Items with `type = 'product'` render with the product-style row (showing parent store name). List is ordered by similarity score descending. No tabs, no separate screens.

**References**: [rpc-search-catalog.md](./contracts/rpc-search-catalog.md), [data-model.md](./data-model.md)

---

## Scenario 2 — Area Isolation (Senours Results Excluded)

**Goal**: A search from Fayoum never surfaces Senours results.

**Steps**:
1. Select area "Fayoum."
2. Search for the exact name of a store or product that exists in "Senours" but NOT in Fayoum.

**Expected**: Zero results (empty-results state shown). The Senours record is NOT returned.

**References**: FR-005, FR-016, research D-007

---

## Scenario 3 — Guest (Unauthenticated) Search

**Goal**: Search works without login.

**Steps**:
1. Open the app without logging in (guest mode).
2. Select an area.
3. Type a search term.

**Expected**: Results appear normally. No login prompt, no 401 error, no empty forced-auth state.

**References**: FR-012, research D-007, [rpc-search-catalog.md](./contracts/rpc-search-catalog.md) (SECURITY INVOKER + anon RLS)

---

## Scenario 4 — Product Result Navigation

**Goal**: Tapping a product result opens `product/[id].tsx` — the same screen as from store browsing.

**Steps**:
1. Search for a product name. Confirm a product result appears.
2. Tap the product result row.

**Expected**: Navigates to `product/[id].tsx` for that product's id. The screen is identical to opening the same product from a store's product list. No new screen, no modal, no parent store redirect.

**References**: FR-009, [api-client-contracts.md](./contracts/api-client-contracts.md) §4

---

## Scenario 5 — Store Result Navigation

**Goal**: Tapping a store result opens the store-detail screen.

**Steps**:
1. Search for a store name. Confirm a store result appears.
2. Tap the store result row.

**Expected**: Navigates to the store-detail screen (`/(customer)/(home)/store/[id]`), same as tapping `StoreCard` on the Home screen.

**References**: FR-010

---

## Scenario 6 — Closed Store Appears in Results

**Goal**: A closed store is visible in search results (not hidden).

**Steps**:
1. Ensure a store in Fayoum has `is_open = false`.
2. Search for that store's name.

**Expected**: The store appears in results. The row shows a "closed" indicator (consistent with how closed stores are shown on the Home screen). Ordering from it remains unavailable.

**References**: FR-011, research D-008

---

## Scenario 7 — Empty Results State

**Goal**: No results shows a clear empty state, not a blank screen.

**Steps**:
1. Search for a term that matches nothing in the selected area (e.g., random gibberish like "zzzzxxx").

**Expected**: `SearchEmptyState` component renders. No blank white screen. No error message.

**References**: FR-013

---

## Scenario 8 — No Area Selected

**Goal**: Without an area, search is gracefully handled.

**Steps**:
1. Open the app without selecting an area.
2. Open the search box and type a query.

**Expected**: The same "select an area" state that the Home screen shows when no area is selected. No RPC call is made (verify in Supabase logs or network tab — no `search_catalog` request fires).

**References**: FR-014, research D-007

---

## Scenario 9 — Minimum Length Guard (Client-Side)

**Goal**: Fewer than 2 characters does not trigger an RPC call.

**Steps**:
1. Open search.
2. Type a single character.

**Expected**: No results list appears. No network request to `search_catalog` (verify in network logs). Idle state shown (empty input area).

**References**: FR-002, [api-client-contracts.md](./contracts/api-client-contracts.md) §3

---

## Database Validation

Run these SQL queries against the Supabase project after applying the migration to confirm the extension and indexes are in place:

```sql
-- Confirm pg_trgm is enabled
SELECT extname FROM pg_extension WHERE extname = 'pg_trgm';
-- Expected: one row with extname = 'pg_trgm'

-- Confirm GIN indexes exist
SELECT indexname, tablename FROM pg_indexes
WHERE indexname IN ('idx_restaurants_name_trgm', 'idx_products_name_trgm');
-- Expected: two rows

-- Smoke test the RPC (replace UUID with actual Fayoum area id)
SELECT * FROM search_catalog('20000000-0000-0000-0000-000000000001', 'بيتز');
-- Expected: rows with result_type in ('store', 'product'), ordered by similarity_score DESC
```
