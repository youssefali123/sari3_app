# Data Model: Unified Catalog Search (008)

**Feature**: `008-catalog-search`
**Date**: 2026-09-27

---

## Domain Entities (TypeScript)

### `SearchResult` (discriminated union)

Lives at: `src/features/search/domain/entities/SearchResult.ts`

```typescript
export type SearchResultType = 'store' | 'product';

export interface StoreResult {
  type: 'store';
  id: string;           // Restaurant UUID
  name: string;
  imageUrl: string | null;
  similarityScore: number;
  isOpen: boolean;
}

export interface ProductResult {
  type: 'product';
  id: string;           // Product UUID
  name: string;
  imageUrl: string | null;
  similarityScore: number;
  storeId: string;      // Parent restaurant UUID — used for navigation context
  storeName: string;    // Parent restaurant name — displayed in result row
}

export type SearchResult = StoreResult | ProductResult;
```

---

## Domain Repository Interface

Lives at: `src/features/search/domain/repositories/SearchRepository.ts`

```typescript
export interface SearchRepository {
  /**
   * Returns up to 20 combined store and product results ranked by trigram
   * similarity, scoped to the given area.
   *
   * @param areaId - UUID of the customer's currently selected area (exact match)
   * @param query  - Search term (at least 2 non-whitespace characters)
   */
  search(areaId: string, query: string): Promise<SearchResult[]>;
}
```

---

## Infrastructure: RPC Row Mapping

The `SupabaseSearchRepository` calls `search_catalog(p_area_id, p_query)` and maps each returned row to the discriminated union:

| RPC Column | Domain Field | Condition |
|---|---|---|
| `result_type` | `type` | always |
| `id` | `id` | always |
| `name` | `name` | always |
| `image_url` | `imageUrl` | always |
| `similarity_score` | `similarityScore` | always |
| `is_open` | `isOpen` | store rows only |
| `store_id` | `storeId` | product rows only |
| `store_name` | `storeName` | product rows only |

---

## Database Schema Changes

### New: `pg_trgm` Extension

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

No new tables are created. The extension enables the `gin_trgm_ops` operator class used by the indexes below.

### New: GIN Trigram Indexes

```sql
-- Index on store names for fast trigram similarity lookup
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm
  ON public.restaurants USING gin (name gin_trgm_ops);

-- Index on product names for fast trigram similarity lookup
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);
```

**Why GIN over GiST**: GIN indexes are larger but have faster lookup performance for search-as-you-type use cases where reads dominate writes. GiST is preferred for nearest-neighbor (KNN) queries — not this use case.

### New: `search_catalog` RPC

```sql
CREATE OR REPLACE FUNCTION public.search_catalog(
  p_area_id UUID,
  p_query   TEXT
)
RETURNS TABLE (
  result_type       TEXT,
  id                UUID,
  name              TEXT,
  image_url         TEXT,
  similarity_score  FLOAT4,
  store_id          UUID,
  store_name        TEXT,
  is_open           BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    'store'::TEXT                      AS result_type,
    r.id                               AS id,
    r.name                             AS name,
    r.image_url                        AS image_url,
    word_similarity(p_query, r.name)   AS similarity_score,
    NULL::UUID                         AS store_id,
    NULL::TEXT                         AS store_name,
    r.is_open                          AS is_open
  FROM public.restaurants r
  WHERE r.area_id = p_area_id
    AND word_similarity(p_query, r.name) > 0.15

  UNION ALL

  SELECT
    'product'::TEXT                    AS result_type,
    p.id                               AS id,
    p.name                             AS name,
    p.image_url                        AS image_url,
    word_similarity(p_query, p.name)   AS similarity_score,
    r.id                               AS store_id,
    r.name                             AS store_name,
    NULL::BOOLEAN                      AS is_open
  FROM public.products p
  JOIN public.restaurants r ON r.id = p.restaurant_id
  WHERE r.area_id = p_area_id
    AND p.is_available = true
    AND word_similarity(p_query, p.name) > 0.15

  ORDER BY similarity_score DESC
  LIMIT 20;
$$;
```

**Design notes**:
- `SECURITY INVOKER`: The caller's RLS context applies. Public read on `restaurants` and `products` already allows anonymous access — no new RLS bypass needed (FR-012, research D-007).
- `STABLE`: Results depend only on inputs and the current data snapshot; safe for Supabase's query planner caching.
- `word_similarity()`: Partial-word matching — better than full `similarity()` for short queries.
- Stores: all stores in the area are eligible (including closed — FR-011).
- Products: only `is_available = true` products (consistent with existing product browsing).
- Result cap: `LIMIT 20` (research D-003).

---

## Existing Tables Referenced (No Changes)

| Table | Relevant Columns | Used For |
|---|---|---|
| `public.restaurants` | `id`, `name`, `image_url`, `area_id`, `is_open` | Store results |
| `public.products` | `id`, `name`, `image_url`, `restaurant_id`, `is_available` | Product results |
| `public.areas` | `id` | Area filtering (joined indirectly via restaurants) |

---

## Migration File

**File**: `supabase/migrations/20260927000001_catalog_search.sql`

**Execution order**:
1. `CREATE EXTENSION IF NOT EXISTS pg_trgm` — enable extension
2. GIN index on `restaurants.name`
3. GIN index on `products.name`
4. `CREATE OR REPLACE FUNCTION search_catalog(...)` — RPC

**Dependencies**: Requires `restaurants.area_id` (feature 006 migration `20260926000001`) and `products` table (feature 001). No new tables.

---

## Entity Relationship Summary

```
areas (id) ──────────────────── restaurants (area_id) ←── search_catalog filters by area
                                 restaurants (id)     ←── products (restaurant_id)
                                        ↓
                               search_catalog UNION
                                        ↓
                               SearchResult[]  (StoreResult | ProductResult)
```
