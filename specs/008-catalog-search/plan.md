# Implementation Plan: Unified Catalog Search (008)

**Branch**: `008-catalog-search` | **Date**: 2026-09-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-catalog-search/spec.md`

---

## Summary

Implement a unified, area-scoped catalog search that returns both matching stores and products in one ranked result list via a single server-side `search_catalog` RPC. Matching is powered by `pg_trgm` trigram similarity (language-agnostic, Arabic-safe). Product results navigate to the existing `product/[id].tsx` detail screen; store results navigate to the existing store-detail screen. The feature is guest-accessible and requires no new external services.

---

## Technical Context

**Language/Version**: TypeScript (strict mode), React Native + Expo SDK 57

**Primary Dependencies**: TanStack Query v5 (server state), Supabase JS client, Expo Router (file-based navigation)

**Storage**: Supabase/PostgreSQL — `restaurants`, `products`, `areas`, `store_categories` tables; new `search_catalog` RPC; two new GIN trigram indexes; `pg_trgm` extension (must be enabled via migration if not already — see research.md Decision D-001)

**Testing**: Manual device/emulator testing per `quickstart.md` scenarios; no automated test suite defined in this feature

**Target Platform**: iOS + Android (React Native / Expo managed workflow)

**Project Type**: Mobile app (feature-first screaming architecture, lightweight Clean Architecture per feature)

**Performance Goals**: Search results visible within 2 seconds of query submission on standard mobile connection (SC-001)

**Constraints**: 
- No external search services (FR-015)
- No Redux for search state (Principle IV — TanStack Query owns server state)
- No `tsvector`/`to_tsquery` (FR-006 — Arabic has no Postgres stemming dictionary)
- Single atomic server-side RPC — no client-side merge (FR-004)
- Exact-match area scoping — no rollup (FR-005, same as feature 006)

**Scale/Scope**: MVP; small-to-mid dataset (Fayoum region stores and products). Result cap: 20 rows per query. Minimum similarity threshold: 0.15 (tuned in research.md D-003).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Status | Notes |
|---|---|---|---|
| **I. Feature-First Structure** | New code MUST live in `src/features/search/` | ✅ PASS | Cross-cutting feature spanning stores+products justifies its own feature directory (see research.md D-005) |
| **II. Lightweight Clean Architecture** | Domain and Application MUST NOT import Supabase/RN/TQ/Redux | ✅ PASS | Domain: `SearchResult` type only. Application: `useSearch` hook (TQ internal to hook, not domain). Infrastructure: `SupabaseSearchRepository`. Presentation: UI components |
| **III. Dependency Direction** | Presentation → Application → Domain ← Infrastructure | ✅ PASS | `SupabaseSearchRepository` implements `SearchRepository` (domain-owned interface) |
| **IV. State Ownership** | Search results in TanStack Query; NO Redux slice | ✅ PASS | `useSearch` wraps `useQuery`. No Redux dispatch for search results |
| **V. Server Is Final Authority** | Area filtering enforced server-side in RPC | ✅ PASS | `search_catalog` filters by `area_id` before returning. Client cannot bypass |
| **VI. Atomic Writes** | N/A — search is read-only | ✅ N/A | No concurrent write race |
| **VII. Immutable Snapshots** | N/A — search is read-only | ✅ N/A | |
| **VIII. Realtime / Push Separation** | N/A — search has no realtime subscription | ✅ N/A | |
| **IX. Deferred Scope** | Search history, voice search, analytics excluded without structural block | ✅ PASS | Domain type is extensible; RPC can be enriched later without breaking existing shape |
| **X. MVP Simplicity** | No DI containers, no polymorphic link patterns | ✅ PASS | Single `SearchResult` discriminated union; no over-abstraction |

**Post-Phase 1 Re-check**: All gates remain PASS. No violations introduced by design artifacts.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-catalog-search/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── rpc-search-catalog.md
│   └── api-client-contracts.md
└── tasks.md             ← Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/features/search/
├── domain/
│   ├── entities/
│   │   └── SearchResult.ts           # Discriminated union: StoreResult | ProductResult
│   └── repositories/
│       └── SearchRepository.ts       # Interface: search(areaId, query) → SearchResult[]
├── application/
│   └── hooks/
│       └── useSearch.ts              # TanStack Query hook with debounce + min-length guard
├── infrastructure/
│   └── SupabaseSearchRepository.ts   # Calls search_catalog RPC, maps rows → domain type
└── presentation/
    ├── SearchBar.tsx                  # Controlled text input, debounced, wired to useSearch
    ├── SearchResultsList.tsx          # FlatList rendering StoreResultRow + ProductResultRow
    ├── StoreResultRow.tsx             # Store result item; navigates to store-detail screen
    ├── ProductResultRow.tsx           # Product result item; navigates to product/[id].tsx
    └── SearchEmptyState.tsx           # Zero-results state (matches existing empty-state pattern)

src/app/(customer)/(home)/
└── index.tsx                          # Existing; SearchBar added to ListHeaderComponent

supabase/migrations/
└── 20260927000001_catalog_search.sql  # pg_trgm enable (if needed), GIN indexes, search_catalog RPC
```

**Structure Decision**: New `src/features/search/` feature directory. Justification: search spans both `restaurants` and `products` domains — placing it in either would create an artificial coupling. This pattern is consistent with how `areas` (spanning `restaurants` + `profiles`) received its own feature directory (see research.md D-005).

---

## Complexity Tracking

> No Constitution Check violations — this section is intentionally blank.
