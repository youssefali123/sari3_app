# Implementation Plan: Catalog and Checkout Foundation

**Branch**: `001-catalog-checkout-foundation` | **Date**: 2026-09-16 | **Spec**: [spec.md](file:///home/youssef/Desktop/sari3-app/sari3_speckit/sari3_app/specs/001-catalog-checkout-foundation/spec.md)

**Input**: Feature specification from `/specs/001-catalog-checkout-foundation/spec.md`

---

## Summary

This feature establishes the core customer ordering lifecycle for Sari3, unifying Restaurants and Markets under a single purchasing model. It implements:
1. Product categories and optional binary add-ons (`ProductAddOn`), with deterministic composite cart item identities (`productId::addonId1,addonId2`).
2. Single-store cart conflict detection and resolution workflow enforced in the Application layer (no silent clearing).
3. Independent Store and Product favorites managed by TanStack Query.
4. Active home screen promotions and server-authoritative single-coupon validation (`validate_coupon` RPC).
5. Customer saved delivery addresses with immutable address snapshots at order placement.
6. Server-authoritative checkout flow (Cash on Delivery) via an atomic Postgres stored procedure (`place_order` RPC) that validates store open status, fetches canonical prices, creates immutable order item and address snapshots, and records redemptions in a single transaction.
7. Order-scoped driver contact details (`get_order_driver_info` RPC) available strictly during active fulfillment (`accepted`, `preparing`, `out_for_delivery`) and revoked upon terminal status (`delivered`, `cancelled`, `rejected`).

---

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode), React 19.2.3, React Native 0.86.3

**Primary Dependencies**:
- Expo SDK 57 (`~57.0.20`), Expo Router (`~57.0.19`)
- TanStack Query v5 (`^5.102.8`) for all server state
- Redux Toolkit (`^2.12.0`) & `react-redux` (`^9.3.0`) for client-local cart state
- Supabase JS (`^2.116.0`) for Postgres database, Auth, RLS, and Realtime
- `@react-native-async-storage/async-storage` (`2.2.0`) for auth session persistence

**Storage**: Supabase PostgreSQL with Row Level Security (RLS) and stored procedures (`place_order`, `validate_coupon`, `get_order_driver_info`)

**Testing**: Jest + React Native Testing Library (unit/component testing), TypeScript compiler strict type checking (`npm run lint`), SQL verification scenarios

**Target Platform**: Universal Mobile (iOS, Android) via Expo SDK 57

**Project Type**: Mobile Application (Expo / React Native)

**Performance Goals**:
- Smooth 60 fps interactions during catalog scrolling, category filtering, and cart mutations
- <300ms response time for cached catalog queries via TanStack Query
- Immediate client-side cart updates with deterministic composite key hashing

**Constraints**:
- Single-store cart enforced in Application layer (no silent cart replacement)
- Cash on delivery only for MVP (online/card payments deferred)
- Delivery fee fixed at 0 in this foundation phase (Principle IX)
- Zero client trust: all prices, coupon discounts, availability, and order totals calculated and validated server-side in Postgres
- Strict driver privacy masking: name, photo, and phone only; access revoked upon order delivery or cancellation

**Scale/Scope**: Unified browsing for restaurants and markets, catalog with add-ons, saved addresses, single-coupon checkout, immutable historical orders

---

## Constitution Check

*GATE: All 10 principles from Constitution v1.0.0 evaluated and satisfied.*

| Principle | Requirement | Compliance Analysis | Status |
|---|---|---|---|
| **I. Feature-First Structure** | Code organized by business capability (`restaurants/`, `products/`, `cart/`, `orders/`, `promotions/`, `addresses/`, `favorites/`). | All new and refactored components live strictly in `src/features/<feature>/` and `src/app/(customer)/`. No technical layer directories at root. | **PASS** |
| **II. Lightweight Clean Architecture** | Domain (pure TS), Application (hooks/state), Infrastructure (Supabase), Presentation (UI). No infra imports in Domain/App. | Repositories defined as pure TS interfaces in Domain; use cases in Application; Supabase queries in Infrastructure; components in Presentation. | **PASS** |
| **III. Dependency Direction** | Presentation → Application → Domain ← Infrastructure | Domain interfaces depend on nothing; Infrastructure implements Domain; Presentation and Application consume Domain. | **PASS** |
| **IV. State Ownership** | TanStack Query owns server state; Redux Toolkit owns client-local cart state only. Realtime updates TanStack Query. | Server state (stores, products, categories, favorites, promotions, coupons, addresses, orders, driver info) owned by TanStack Query. Cart owned by Redux Toolkit. | **PASS** |
| **V. Server Is Final Authority** | Client checks are UX conveniences; RLS + Postgres functions enforce pricing, discounts, and order persistence. | `place_order` and `validate_coupon` Postgres RPCs derive canonical prices and totals. Client-submitted prices are ignored. | **PASS** |
| **VI. Atomic Concurrency Writes** | Concurrency-critical writes atomic at database level. | `place_order` executes within a single atomic PostgreSQL transaction with row-level locks on coupons (`FOR UPDATE`). | **PASS** |
| **VII. Historical Records Are Immutable Snapshots** | Order items, add-ons, and delivery address must be immutable snapshots at placement time. | `orders` stores `delivery_address` and `delivery_address_label` text snapshots. `order_items` stores name, price snapshots, and `addon_snapshots` JSONB array. | **PASS** |
| **VIII. Realtime & Push Are Separate Concerns** | Realtime in-app updates separate from push notifications; hidden behind Domain service interfaces. | `OrderRealtimeService` interface shields domain from Supabase Realtime transport. Direct cache writes (`setQueryData`) used. | **PASS** |
| **IX. Deferred Scope Extensible** | Architecture allows future GPS, online payments, admin dashboard, dynamic delivery fees without rewrites. | `payment_method` enum ready for new payment types; `delivery_fee` column ready for calculation algorithms; driver info service extensible for GPS coordinates. | **PASS** |
| **X. Practical MVP Simplicity** | Avoid unnecessary abstractions, empty folders, or premature generalization. | Flat binary add-ons, single coupon per order, simple Postgres schema, pragmatic feature-sliced folders. | **PASS** |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-catalog-checkout-foundation/
├── plan.md              # Implementation plan (this file)
├── research.md          # Phase 0 architectural decisions & technical context
├── data-model.md        # Phase 1 data models, Postgres schema, RLS, and entities
├── quickstart.md        # Phase 1 runnable validation scenarios
├── contracts/           # Phase 1 interface contracts
│   ├── database-rpc.md        # Postgres RPC specifications (place_order, validate_coupon, driver info)
│   ├── domain-repositories.md # TypeScript repository & service interfaces (Domain layer)
│   └── cart-actions.md        # Redux cart state shape, actions, and conflict hook
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code Layout

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (customer)/
│   │   ├── _layout.tsx
│   │   ├── (home)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx                # Home screen: stores (restaurants & markets), promotions carousel
│   │   │   ├── store/
│   │   │   │   └── [id].tsx             # Store detail: category tabs, products list
│   │   │   └── promotion/
│   │   │       └── [id].tsx             # Promoted stores/products list
│   │   ├── cart.tsx                     # Review cart, conflict modal, checkout button
│   │   ├── checkout/
│   │   │   └── index.tsx                # Checkout flow: address selection, coupon input, review total, place order
│   │   ├── favorites/
│   │   │   ├── stores.tsx               # Favorite stores screen
│   │   │   └── products.tsx             # Favorite products screen
│   │   ├── addresses/
│   │   │   └── index.tsx                # Saved delivery addresses management (CRUD)
│   │   ├── orders/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx                # Customer order history list
│   │   │   └── [id].tsx                 # Customer order detail, status tracking & scoped driver card
│   │   └── profile.tsx                  # Profile screen with links to addresses & favorites
│   └── (driver)/
│       ├── _layout.tsx
│       ├── active-order.tsx
│       ├── available-orders/
│       ├── history/
│       └── profile.tsx
├── features/
│   ├── cart/
│   │   ├── domain/
│   │   │   ├── entities/CartItem.ts     # Composite cart item interface
│   │   │   └── cartUtils.ts             # Deterministic key generation & subtotal math
│   │   ├── application/
│   │   │   ├── cartSlice.ts             # Redux slice with composite keys & single-store conflict handling
│   │   │   └── useAddToCart.ts          # Application-layer conflict resolution hook
│   │   └── presentation/
│   │       ├── CartItemRow.tsx
│   │       └── StoreConflictModal.tsx
│   ├── restaurants/ (stores)
│   │   ├── domain/
│   │   │   ├── entities/Store.ts        # Unified Store entity (Restaurant & Market)
│   │   │   ├── entities/StoreCategory.ts# Category entity
│   │   │   └── repositories/StoreRepository.ts
│   │   ├── infrastructure/
│   │   │   └── SupabaseStoreRepository.ts
│   │   └── presentation/
│   │       ├── StoreCard.tsx
│   │       └── CategoryTabBar.tsx
│   ├── products/
│   │   ├── domain/
│   │   │   ├── entities/Product.ts
│   │   │   ├── entities/ProductAddOn.ts # Binary add-on modifier entity
│   │   │   └── repositories/ProductRepository.ts
│   │   ├── infrastructure/
│   │   │   └── SupabaseProductRepository.ts
│   │   └── presentation/
│   │       ├── ProductCard.tsx
│   │       └── AddOnSelectorModal.tsx
│   ├── promotions/
│   │   ├── domain/
│   │   │   ├── entities/Promotion.ts
│   │   │   ├── entities/Coupon.ts       # Coupon & validation result entities
│   │   │   └── repositories/
│   │   │       ├── PromotionRepository.ts
│   │   │       └── CouponRepository.ts
│   │   ├── infrastructure/
│   │   │   ├── SupabasePromotionRepository.ts
│   │   │   └── SupabaseCouponRepository.ts
│   │   └── presentation/
│   │       ├── PromoBannerCarousel.tsx
│   │       └── CouponInputSection.tsx
│   ├── addresses/
│   │   ├── domain/
│   │   │   ├── entities/SavedDeliveryAddress.ts
│   │   │   └── repositories/AddressRepository.ts
│   │   ├── infrastructure/
│   │   │   └── SupabaseAddressRepository.ts
│   │   └── presentation/
│   │       ├── AddressCard.tsx
│   │       └── AddressSelectionModal.tsx
│   ├── favorites/
│   │   ├── domain/
│   │   │   └── repositories/FavoritesRepository.ts
│   │   ├── infrastructure/
│   │   │   └── SupabaseFavoritesRepository.ts
│   │   └── presentation/
│   │       └── FavoriteButton.tsx
│   ├── orders/
│   │   ├── domain/
│   │   │   ├── entities/Order.ts        # Order with immutable snapshot types
│   │   │   ├── entities/OrderStatus.ts
│   │   │   ├── entities/OrderDriverInfo.ts
│   │   │   ├── repositories/OrderRepository.ts
│   │   │   └── services/OrderRealtimeService.ts
│   │   ├── infrastructure/
│   │   │   ├── SupabaseOrderRepository.ts # Invokes place_order & get_order_driver_info RPCs
│   │   │   └── SupabaseOrderRealtimeService.ts
│   │   └── presentation/
│   │       ├── OrderSummaryCard.tsx
│   │       └── ScopedDriverCard.tsx
│   ├── drivers/
│   ├── auth/
│   └── notifications/
├── providers/
│   └── AppProviders.tsx                 # Redux Provider, QueryClientProvider, SafeAreaProvider
└── shared/
    ├── lib/
    │   ├── supabase.ts                  # Supabase client configured with AsyncStorage
    │   ├── queryClient.ts               # TanStack Query client configuration
    │   └── store.ts                     # Redux Toolkit store registration
    ├── types/
    │   └── common.ts                    # MoneyAmount, UUID, Unsubscribe
    ├── ui/
    │   ├── components/                  # Shared Button, Input, EmptyState, LoadingSpinner
    │   └── theme/                       # Colors, Spacing, Typography
    └── utils/
        ├── formatting.ts                # Currency formatting (piasters to EGP)
        └── validation.ts
```

---

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *None* | *All architectural decisions strictly comply with the Sari3 Constitution.* | *N/A* |
