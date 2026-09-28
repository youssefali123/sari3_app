# Contract: `search_catalog` RPC

**Feature**: `008-catalog-search`
**Date**: 2026-09-27
**Source**: [data-model.md](../data-model.md) — D-006, D-003

---

## Function Signature

```sql
public.search_catalog(
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
```

---

## Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `p_area_id` | `UUID` | Yes | The customer's currently selected area (exact match — no rollup) |
| `p_query` | `TEXT` | Yes | Search term (at least 2 characters as enforced client-side; RPC itself has no length guard) |

---

## Return Columns

| Column | Type | Nullable | Description |
|---|---|---|---|
| `result_type` | `TEXT` | No | `'store'` or `'product'` |
| `id` | `UUID` | No | Store id or Product id |
| `name` | `TEXT` | No | Store name or product name |
| `image_url` | `TEXT` | Yes | Cover image URL |
| `similarity_score` | `FLOAT4` | No | `word_similarity(p_query, name)` — higher = more relevant |
| `store_id` | `UUID` | Yes | Parent store id — populated for product rows, `NULL` for store rows |
| `store_name` | `TEXT` | Yes | Parent store name — populated for product rows, `NULL` for store rows |
| `is_open` | `BOOLEAN` | Yes | Store open/closed flag — populated for store rows, `NULL` for product rows |

---

## Ordering & Limits

- Results are ordered by `similarity_score DESC` (most relevant first)
- Maximum 20 rows returned (combined stores + products)
- Minimum threshold: `word_similarity > 0.15` (rows below this score are excluded)

---

## Access Control

- **Security**: `SECURITY INVOKER` — caller's RLS context applies
- **Guest access**: Allowed — `anon` role has `SELECT` on `restaurants` and `products` via existing RLS policies
- **No auth required**: Consistent with FR-012 and guest browsing behavior

---

## Business Rules

1. **Area scoping** (FR-005): Only stores and products where `restaurants.area_id = p_area_id` are returned. Exact match, no rollup.
2. **Closed stores included** (FR-011): `restaurants.is_open` is NOT a filter condition. Closed stores appear in results; `is_open = false` is surfaced to the client for rendering purposes.
3. **Available products only**: Products with `is_available = false` are excluded — consistent with existing product browsing.
4. **Trigram matching** (FR-006): `word_similarity()` used for partial-word matching, language-agnostic (supports Arabic).

---

## Client-Side Call (Supabase JS)

```typescript
const { data, error } = await supabase
  .rpc('search_catalog', {
    p_area_id: areaId,
    p_query: query,
  });
```

**Expected response on success** (`data`):

```json
[
  {
    "result_type": "store",
    "id": "...",
    "name": "مطعم الفيوم",
    "image_url": "https://...",
    "similarity_score": 0.42,
    "store_id": null,
    "store_name": null,
    "is_open": true
  },
  {
    "result_type": "product",
    "id": "...",
    "name": "بيتزا مارغريتا",
    "image_url": "https://...",
    "similarity_score": 0.38,
    "store_id": "...",
    "store_name": "مطعم الفيوم",
    "is_open": null
  }
]
```

**Expected response on no results**: `[]` (empty array)

---

## Error Cases

| Scenario | Supabase Error Code | Client Handling |
|---|---|---|
| Invalid `p_area_id` UUID format | `22P02` | Show generic error state |
| Network timeout | N/A | Show generic error state |
| Extension not enabled (pg_trgm missing) | `42883` (function not found) | Migration must run first — this is a deployment error, not a client concern |
