# Contract: API Client Contracts (008-catalog-search)

**Feature**: `008-catalog-search`
**Date**: 2026-09-27

---

## 1. Domain Types

### `SearchResult` (discriminated union)

```typescript
// src/features/search/domain/entities/SearchResult.ts

export interface StoreResult {
  type: 'store';
  id: string;
  name: string;
  imageUrl: string | null;
  similarityScore: number;
  isOpen: boolean;
}

export interface ProductResult {
  type: 'product';
  id: string;
  name: string;
  imageUrl: string | null;
  similarityScore: number;
  storeId: string;    // Navigate to product/[id].tsx; storeId for display only
  storeName: string;
}

export type SearchResult = StoreResult | ProductResult;
```

---

## 2. Repository Interface

```typescript
// src/features/search/domain/repositories/SearchRepository.ts

export interface SearchRepository {
  search(areaId: string, query: string): Promise<SearchResult[]>;
}
```

---

## 3. Application Hook API

```typescript
// src/features/search/application/hooks/useSearch.ts

/**
 * Returns:
 * - results: SearchResult[] — combined store + product results, ranked by similarity
 * - isLoading: boolean
 * - isError: boolean
 * - isEmpty: boolean — true when query is valid but returned zero results
 * - isIdle: boolean — true when query is below minimum length or area not selected
 */
useSearch(query: string): {
  results: SearchResult[];
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  isIdle: boolean;
}
```

**Behaviour**:
- `query` is the raw input string from `SearchBar`.
- Hook internally debounces by 300ms before issuing the TanStack Query fetch.
- Hook reads `selectedAreaId` from `useSelectedArea()` (existing areas hook).
- If `selectedAreaId` is null OR `query.trim().length < 2`: returns `{ results: [], isLoading: false, isError: false, isEmpty: false, isIdle: true }` — no RPC call.
- TanStack Query key: `['search', 'catalog', selectedAreaId, debouncedQuery]`

---

## 4. Navigation Contracts

### Tapping a `StoreResult`

```typescript
router.push(`/(customer)/(home)/store/${result.id}`);
// or the canonical store-detail route — use existing StoreCard navigation pattern
```

### Tapping a `ProductResult`

```typescript
router.push(`/product/${result.id}`);
// product/[id].tsx — same route used by store browsing and favorites
```

---

## 5. Presentation Component API Surface

### `SearchBar`

```typescript
interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;  // default: "Search stores and products..."
}
```

### `SearchResultsList`

```typescript
interface SearchResultsListProps {
  results: SearchResult[];
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  isIdle: boolean;
}
```

Renders:
- `isIdle` → nothing (list not shown)
- `isLoading` → `LoadingSpinner` (existing shared component)
- `isError` → `ErrorView` (existing shared component)
- `isEmpty` → `SearchEmptyState`
- results → `FlatList` with `StoreResultRow` or `ProductResultRow` per item

### `StoreResultRow`

```typescript
interface StoreResultRowProps {
  result: StoreResult;
  onPress: () => void;
}
```

### `ProductResultRow`

```typescript
interface ProductResultRowProps {
  result: ProductResult;
  onPress: () => void;
}
```

---

## 6. TanStack Query Cache Key Convention

| Key | When used |
|---|---|
| `['search', 'catalog', areaId, query]` | Active search query with valid area + ≥2 char query |

Cache is not manually invalidated on order or cart changes — search results reflect the current catalog state as fetched.
