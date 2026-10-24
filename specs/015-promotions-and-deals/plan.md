# Implementation Plan: Dynamic Promotional Banners & Product Exclusive Deals

**Branch**: `015-promotions-and-deals` | **Date**: 2026-10-24 | **Spec**: [spec.md](file:///home/youssef/Documents/sari3_improve_ui/sari3-app3/specs/015-promotions-and-deals/spec.md)

**Input**: Feature specification from `/specs/015-promotions-and-deals/spec.md`

## Summary

Deliver a rich, dynamic promotional advertising and product deal system:
1. **Auto-Sliding Promotional Banners**: Positioned on the home screen directly beneath the static yellow greeting banner ("ماذا تريد اليوم؟") and above the 6-department categories grid. Featuring a 3.5s interval auto-slider, touch-to-pause gestures, real-time pagination indicator dots (active brand pill, inactive dots), and dual-targeting behavior (navigates to `/store/[id]` if linked, or functions as non-clickable announcement if null).
2. **Product Exclusive Deals Section**: Positioned directly beneath the 6-department categories grid ("عروض حصرية (تنتهي قريباً)"), featuring up to 10 top deals in a horizontal carousel using a new 3:4 vertical card (`DealProductCard`). Each card shows product image, green percentage discount badge (`خصم 20%`), merchant name attribution, rating, strikethrough original price, active price, and favorite toggle.
3. **Dedicated Full-Screen Deals Page**: Accessible via `<` chevron navigation from the home deals header, rendering a responsive 2-column grid of 3:4 deal cards with department filter pills and search.
4. **Catalog-Wide Pricing Consistency**: Strikethrough original prices and discount badges appear seamlessly across store menus (`ProductRow`, `ProductCard`), search results, favorites, and the Product Detail Screen (`/product/[id]`).

---

## Technical Context

**Language/Version**: TypeScript 5.9 (Strict mode enabled)  
**Primary Dependencies**: React Native, Expo SDK 57, Expo Router (file-based), TanStack Query v5, Lucide React Native, `expo-image`  
**Storage**: PostgreSQL (Supabase) with Row Level Security (RLS)  
**Testing**: Jest + React Native Testing Library, TypeScript typecheck (`tsc --noEmit`), ESLint  
**Target Platform**: iOS and Android mobile devices, Expo Go / Dev Client  
**Project Type**: Mobile Application (Clean Architecture, Feature-First)  
**Performance Goals**: 60fps scrolling on carousels and 2-column grids; banner slide latency < 100ms; deal query execution < 50ms using database partial index  
**Constraints**: Zero server state duplication into Redux (Constitution Principle IV); strict Arabic RTL formatting; strict area scoping (SC-005: 0% deals from stores outside customer's selected area); preserve existing horizontal `ProductCard` and `ProductRow`  
**Scale/Scope**: Top 10 deals on home carousel, unlimited catalog deals on `/deals` page, up to 10 active promotional banners  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Status | Notes |
|-----------|-------------|--------|-------|
| **I. Feature-First Structure** | Organize by business capability | **PASS** | Banners reside in `src/features/promotions/`; product deals reside in `src/features/products/`. |
| **II. Clean Architecture** | Domain, Application, Infrastructure, Presentation layers | **PASS** | Entities and repository interfaces in `domain/`; TanStack Query hooks in `application/`; Supabase repositories in `infrastructure/`; UI in `presentation/`. |
| **III. Dependency Direction** | Presentation → Application → Domain ← Infrastructure | **PASS** | Domain is pure TypeScript. Infrastructure implements Domain interfaces. |
| **IV. State Ownership** | TanStack Query owns server state; Redux owns client-local state | **PASS** | Banners and deals queries managed purely via TanStack Query. No Redux duplication. |
| **V. Server Authority** | Database enforces data integrity | **PASS** | Postgres checks `original_price > 0`; stored generated column `is_deal` ensures server-computed deal qualification. |
| **VII. Historical Immutability** | Order records snapshot prices at transaction time | **PASS** | Historical orders snapshot line item prices; adding `original_price` to catalog does not alter past orders. |
| **X. Practical MVP Simplicity** | Simplicity over theoretical purity | **PASS** | Direct `FlatList` with `pagingEnabled` for banner carousel; standard Postgres generated column and partial index for deal filtering. |

---

## Project Structure

### Documentation (this feature)

```text
specs/015-promotions-and-deals/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── repository-contracts.ts
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20261024000002_promotions_and_deals.sql    # Schema migration: promotions.store_id, products.original_price, products.is_deal, indices

src/
├── features/
│   ├── promotions/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── Promotion.ts              # Extended Promotion entity with storeId
│   │   │   └── repositories/
│   │   │       └── PromotionRepository.ts    # Promotion repository interface
│   │   ├── infrastructure/
│   │   │   └── SupabasePromotionRepository.ts# Supabase query with store_id & is_active ordering
│   │   ├── application/
│   │   │   └── hooks/
│   │   │       └── usePromotions.ts          # TanStack Query hook for active banners
│   │   └── presentation/
│   │       ├── PromoBannerCarousel.tsx       # Auto-sliding banner carousel with dots & touch pause
│   │       └── PromoBannerPagination.tsx     # Elongated pill & circular dots indicator
│   │
│   └── products/
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── Product.ts                # Extended with originalPrice
│       │   │   └── DealProduct.ts            # Deal entity with discount percentage & store attribution
│       │   └── repositories/
│       │       └── ProductRepository.ts      # Extended with getExclusiveDeals
│       ├── infrastructure/
│       │   └── SupabaseProductRepository.ts  # Implementation querying products & stores by area
│       ├── application/
│       │   └── hooks/
│       │       └── useExclusiveDeals.ts      # TanStack Query hook for exclusive deals
│       └── presentation/
│           ├── DealProductCard.tsx           # 3:4 vertical card with percentage badge & strikethrough price
│           ├── DealsHorizontalCarousel.tsx   # Top 10 deals strip for home screen
│           ├── ProductCard.tsx               # Updated horizontal card with strikethrough & discount badge
│           └── ProductRow.tsx                # Updated store menu row with strikethrough & discount badge
│
└── app/
    ├── (customer)/
    │   └── (home)/
    │       ├── index.tsx                     # Home screen: Promo banner below greeting, Deals below categories
    │       └── deals.tsx                     # Dedicated 2-column full-screen deals page with filters
    └── product/
        └── [id].tsx                          # Product detail screen: Price header with discount & strikethrough
```

**Structure Decision**: Retains existing Screaming Architecture. Extends `promotions` and `products` feature directories following Clean Architecture layers without adding unnecessary layers or packages.

---

## Complexity Tracking

*No constitutional violations identified. Design adheres strictly to all core principles.*
