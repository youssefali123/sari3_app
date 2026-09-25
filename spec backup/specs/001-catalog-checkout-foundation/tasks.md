# Tasks: Catalog and Checkout Foundation

**Input**: Design documents from `specs/001-catalog-checkout-foundation/` (`plan.md`, `spec.md`, `data-model.md`, `research.md`, `contracts/`, `quickstart.md`, `.specify/memory/constitution.md`)

**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`

**Tests**: Automated tests were not requested in the specification; validation is conducted via TypeScript compiler verification (`npm run lint`) and runnable end-to-end scenarios from `quickstart.md`.

**Organization**: Tasks are grouped by phase and user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US5]`, `[US3]`, `[US4]`, `[US6]`)
- Exact file paths are specified in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project verification, shared type primitives, formatting, and state provider configuration

- [ ] T001 [P] Verify Expo SDK 57 dependencies (`~57.0.20`), React 19.2.3, React Native 0.86.3, and Expo Router (`~57.0.19`) in package.json and app.json
- [ ] T002 [P] Implement common domain types (`MoneyAmount = number`, `UUID = string`, `Unsubscribe = () => void`) in src/shared/types/common.ts
- [ ] T003 [P] Implement currency formatting utility converting integer piasters to EGP (`EGP X.XX`) with non-negative handling in src/shared/utils/formatting.ts
- [ ] T004 [P] Configure TanStack Query client with caching defaults and stale-time policies in src/shared/lib/queryClient.ts
- [ ] T005 Configure Redux Toolkit store registering `cartSlice` with typed hooks (`useAppDispatch`, `useAppSelector`) in src/shared/lib/store.ts
- [ ] T006 Verify root provider hierarchy (`QueryClientProvider`, Redux `Provider`, `SafeAreaProvider`) in src/providers/AppProviders.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core PostgreSQL schema migrations, stored procedures (RPCs), and domain entities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 [P] Create PostgreSQL schema migration adding `store_type` enum (`'restaurant'`, `'market'`), `store_categories` table (`store_id REFERENCES restaurants(id) ON DELETE CASCADE`, `display_order INTEGER NOT NULL DEFAULT 0`), `products.category_id REFERENCES store_categories(id) ON DELETE SET NULL`, and `product_add_ons` table (`price INTEGER NOT NULL CHECK (price >= 0)`, `is_available BOOLEAN NOT NULL DEFAULT true`) in supabase/migrations/20260916000000_catalog_schema.sql
- [ ] T008 [P] Create PostgreSQL schema migration adding `saved_addresses` table (`customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`, `is_default BOOLEAN NOT NULL DEFAULT false`), `favorite_stores` (`PRIMARY KEY (customer_id, store_id)`), and `favorite_products` (`PRIMARY KEY (customer_id, product_id)`) in supabase/migrations/20260916000001_addresses_favorites_schema.sql
- [ ] T009 [P] Create PostgreSQL schema migration adding `promotions` table (`target_type TEXT NOT NULL CHECK (target_type IN ('store', 'product'))`, `is_active BOOLEAN NOT NULL DEFAULT true`), `promotion_targets`, `coupons` table (`discount_type public.coupon_discount_type NOT NULL`, `CONSTRAINT coupons_discount_positive CHECK (discount_value > 0)`, `min_order_amount >= 0`), and `coupon_redemptions` with explicit `order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT` in supabase/migrations/20260916000002_promotions_coupons_schema.sql
- [ ] T010 [P] Create PostgreSQL schema migration updating `orders` table (`payment_method public.payment_method NOT NULL DEFAULT 'cash_on_delivery'`, `discount_amount INTEGER NOT NULL DEFAULT 0`, `subtotal_amount INTEGER NOT NULL DEFAULT 0`, `delivery_fee INTEGER NOT NULL DEFAULT 0`, `delivery_address_label TEXT`), dropping constraint `order_items_product_once_per_order`, and adding `order_items.addon_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb` and `order_items.subtotal INTEGER NOT NULL DEFAULT 0` in supabase/migrations/20260916000003_orders_snapshots_schema.sql
- [ ] T011 [P] Create Row Level Security (RLS) policies migration for public store/product/category reading, customer-scoped addresses/favorites/orders (`auth.uid() = customer_id`), and restricted coupon access in supabase/migrations/20260916000004_rls_policies.sql
- [ ] T012 Create atomic `place_order` stored procedure migration validating store open status (`is_open = true`), fetching canonical prices, validating/redeeming coupon, calculating `final_total = items_subtotal - coupon_discount`, and inserting immutable order/item/address snapshots in supabase/migrations/20260916000005_place_order_rpc.sql
- [ ] T013 [P] Create read-only `validate_coupon` stored procedure migration validating code, active dates, store restriction, minimum order amount, and usage limits in supabase/migrations/20260916000006_validate_coupon_rpc.sql
- [ ] T014 [P] Create scoped `get_order_driver_info` stored procedure migration returning strictly `driver_name`, `driver_photo_url`, and `driver_phone` when `orders.status IN ('accepted', 'preparing', 'out_for_delivery')` and returning `NULL` upon terminal states (delivered, cancelled, rejected) in supabase/migrations/20260916000007_driver_info_rpc.sql
- [ ] T015 [P] Define unified `Store` domain entity with `type StoreType = 'restaurant' | 'market'`, `rating: number | null` (range 0.0 - 5.0), and `isOpen: boolean` in src/features/restaurants/domain/entities/Store.ts
- [ ] T016 [P] Define `StoreCategory` domain entity with `displayOrder: number` in src/features/restaurants/domain/entities/StoreCategory.ts
- [ ] T017 [P] Define `Product` domain entity with `categoryId: string | null`, `price: MoneyAmount` (in piasters, non-negative `CHECK (price >= 0)`), and `isAvailable: boolean` in src/features/products/domain/entities/Product.ts
- [ ] T018 [P] Define `ProductAddOn` domain entity with `price: MoneyAmount` (non-negative `CHECK (price >= 0)`), `isAvailable: boolean`, and binary selection (max quantity 1) in src/features/products/domain/entities/ProductAddOn.ts
- [ ] T019 [P] Define `Order` domain entity with `deliveryAddressSnapshot: string`, `OrderStatus` enum (`pending`, `accepted`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`, `rejected`), `AddOnSnapshot`, and `OrderItemSnapshot` in src/features/orders/domain/entities/Order.ts

**Checkpoint**: Foundation ready - all migrations, RPCs, and core domain types in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Browse Stores and Place Order with Add-ons (Priority: P1) 🎯 MVP

**Goal**: A logged-in customer opens the home screen, sees both restaurants and markets visually distinguished, navigates category tabs, configures products with optional binary add-ons, adds them to the cart using composite item keys, reviews the cart, selects a delivery address, chooses cash on delivery, and places an order via the atomic `place_order` RPC with immutable snapshots. Closed stores block ordering.

**Independent Test**: Browse an open restaurant or market, select a category, configure a product with two binary add-ons, add to cart (verify composite key `${productId}::${sortedAddonIds}`), proceed to checkout with a saved delivery address and Cash on Delivery, place order via `place_order` RPC, and verify that the retrieved order displays the immutable product name, unit price, add-on snapshots, and delivery address snapshot. Also verify that attempting to order from a closed store throws `STORE_CLOSED`.

### Implementation for User Story 1

- [ ] T020 [P] [US1] Define `StoreRepository` domain interface with `getStores(type?: StoreType)`, `getStoreById(id: string)`, and `getCategoriesByStoreId(storeId: string)` in src/features/restaurants/domain/repositories/StoreRepository.ts
- [ ] T021 [P] [US1] Implement `SupabaseStoreRepository` querying `restaurants` and `store_categories` in src/features/restaurants/infrastructure/SupabaseStoreRepository.ts
- [ ] T022 [P] [US1] Define `ProductRepository` domain interface with `getProductsByStore(storeId: string, categoryId?: string)`, `getProductById(id: string)`, and `getAddOnsByProductId(productId: string)` in src/features/products/domain/repositories/ProductRepository.ts
- [ ] T023 [P] [US1] Implement `SupabaseProductRepository` querying `products` and `product_add_ons` in src/features/products/infrastructure/SupabaseProductRepository.ts
- [ ] T024 [P] [US1] Define `CartItem` and `CartAddOnSelection` interfaces with standardized `addonIds: string[]`, composite identity `${productId}::${sortedAddonIds.join(',')}`, and binary add-ons (max quantity 1) in src/features/cart/domain/entities/CartItem.ts
- [ ] T025 [P] [US1] Implement `generateCartItemId` deterministic composite key generator (sorting `addonIds`) and cart subtotal calculation in src/features/cart/domain/cartUtils.ts
- [ ] T026 [US1] Implement `cartSlice` with composite keys, `addItem`, `removeItem`, `updateQuantity`, and `clearCart` reducers and selectors in src/features/cart/application/cartSlice.ts
- [ ] T027 [P] [US1] Define `OrderRepository` domain interface with `PlaceOrderInput` using `addonIds: string[]`, `getOrderById(id: string)`, and `getCustomerOrders(customerId: string)` in src/features/orders/domain/repositories/OrderRepository.ts
- [ ] T028 [US1] Implement `SupabaseOrderRepository` invoking `place_order` stored procedure with centralized camelCase `addonIds` to snake_case `addon_ids` mapping and SQL `delivery_address` to `deliveryAddressSnapshot` in src/features/orders/infrastructure/SupabaseOrderRepository.ts
- [ ] T029 [P] [US1] Implement `StoreCard` component displaying store image, name, type badge ("Restaurant" vs "Market" per FR-002), rating, and open status in src/features/restaurants/presentation/StoreCard.tsx
- [ ] T030 [P] [US1] Implement `CategoryTabBar` horizontal tab filter component for store categories in src/features/restaurants/presentation/CategoryTabBar.tsx
- [ ] T031 [P] [US1] Implement `ProductCard` component showing name, description, price, and add button disabled when store `isOpen = false` (BR-001, FR-024) in src/features/products/presentation/ProductCard.tsx
- [ ] T032 [P] [US1] Implement `AddOnSelectorModal` component for configuring binary add-on options (max quantity 1, displaying unit prices) in src/features/products/presentation/AddOnSelectorModal.tsx
- [ ] T033 [P] [US1] Implement `CartItemRow` component displaying product name, selected add-ons list, price, quantity stepper, and remove action in src/features/cart/presentation/CartItemRow.tsx
- [ ] T034 [US1] Implement unified Home screen displaying restaurants and markets with type filtering and store cards in src/app/(customer)/(home)/index.tsx
- [ ] T035 [US1] Implement Store Detail screen with store header, category tab switching, products list, and add-on selector modal in src/app/(customer)/(home)/store/[id].tsx
- [ ] T036 [US1] Implement Cart review screen rendering line items, store name, subtotal, and checkout entry button in src/app/(customer)/cart.tsx
- [ ] T037 [US1] Implement Checkout screen supporting saved address selection (populating `deliveryAddressSnapshot`), Cash on Delivery (`payment_method = 'cash_on_delivery'`), delivery fee fixed to 0, and order placement in src/app/(customer)/checkout/index.tsx
- [ ] T038 [US1] Implement Customer Order History screen listing past orders with store name, date, status, and total in src/app/(customer)/orders/index.tsx
- [ ] T039 [US1] Implement Customer Order Detail screen displaying immutable snapshots of product names, unit prices, add-on snapshots, `deliveryAddressSnapshot`, and status in src/app/(customer)/orders/[id].tsx

**Checkpoint**: At this point, User Story 1 (MVP) is fully functional and testable end-to-end.

---

## Phase 4: User Story 2 - Single-Store Cart Conflict Resolution (Priority: P2)

**Goal**: Enforce single-store cart integrity at the application layer. When a customer attempts to add an item from a different store than existing cart contents, trigger a confirmation prompt with confirm and decline handling (no silent cart replacement).

**Independent Test**: Add an item from Store A, then attempt to add an item from Store B. Verify confirmation modal appears asking to replace cart contents. Verify declining keeps Store A items. Verify confirming clears Store A and adds the Store B item. Verify adding to an empty cart does not trigger the prompt.

### Implementation for User Story 2

- [ ] T040 [US2] Extend `cartSlice` state with `conflictState` (`isOpen: boolean`, `pendingItem`), `clearAndAddItem`, `setConflictPrompt`, and `dismissConflict` actions in src/features/cart/application/cartSlice.ts
- [ ] T041 [US2] Implement `useAddToCart` application hook executing single-store conflict check and dispatching conflict prompt instead of silent clearing (BR-002, BR-010, SC-003) in src/features/cart/application/useAddToCart.ts
- [ ] T042 [P] [US2] Implement `StoreConflictModal` presentation component asking customer to confirm or decline replacing cart items from a different store in src/features/cart/presentation/StoreConflictModal.tsx
- [ ] T043 [US2] Integrate `StoreConflictModal` and `useAddToCart` conflict resolution into Store Detail screen in src/app/(customer)/(home)/store/[id].tsx

**Checkpoint**: At this point, User Stories 1 AND 2 work independently with full single-store integrity.

---

## Phase 5: User Story 5 - Saved Delivery Addresses (Priority: P2)

**Goal**: Customer can manage multiple saved delivery addresses with labels ("Home", "Work", etc.) in their profile, edit/delete them, set default addresses, and select an address during checkout. Deleting or editing a saved address never affects previously placed order snapshots.

**Independent Test**: Add two saved delivery addresses in profile. Edit one, set one as default. Select one during checkout and place an order. Afterward, delete the saved address and verify that the placed order still displays the original address snapshot unchanged.

### Implementation for User Story 5

- [ ] T044 [P] [US5] Define `SavedDeliveryAddress` domain entity with `label: string`, `addressText: string`, and `isDefault: boolean` in src/features/addresses/domain/entities/SavedDeliveryAddress.ts
- [ ] T045 [P] [US5] Define `AddressRepository` domain interface with `getAddresses`, `createAddress`, `updateAddress`, and `deleteAddress` in src/features/addresses/domain/repositories/AddressRepository.ts
- [ ] T046 [US5] Implement `SupabaseAddressRepository` with RLS queries (`auth.uid() = customer_id`) in src/features/addresses/infrastructure/SupabaseAddressRepository.ts
- [ ] T047 [P] [US5] Implement `AddressCard` component displaying address label, text, default badge, and edit/delete actions in src/features/addresses/presentation/AddressCard.tsx
- [ ] T048 [P] [US5] Implement `AddressSelectionModal` component for choosing an address at checkout or adding a new one (FR-016) in src/features/addresses/presentation/AddressSelectionModal.tsx
- [ ] T049 [US5] Implement Saved Delivery Addresses management screen supporting list, add, edit, and delete in src/app/(customer)/addresses/index.tsx
- [ ] T050 [US5] Add Saved Addresses navigation entry in Customer Profile screen in src/app/(customer)/profile.tsx
- [ ] T051 [US5] Integrate `AddressSelectionModal` into Checkout screen for choosing delivery address before order submission in src/app/(customer)/checkout/index.tsx

**Checkpoint**: At this point, User Story 5 provides full address management and links into checkout seamlessly.

---

## Phase 6: User Story 3 - Store and Product Favorites (Priority: P3)

**Goal**: Customer can independently favorite and unfavorite stores (restaurants and markets) and products. Separate Favorite Stores and Favorite Products screens allow browsing favorited items independently.

**Independent Test**: Tap favorite button on a store and a product. Navigate to Favorite Stores screen; verify store is listed. Navigate to Favorite Products screen; verify product is listed. Unfavorite the store; verify it disappears from Favorite Stores while product remains favorited.

### Implementation for User Story 3

- [ ] T052 [P] [US3] Define `FavoriteStore` and `FavoriteProduct` domain entities in src/features/favorites/domain/entities/Favorite.ts
- [ ] T053 [P] [US3] Define `FavoritesRepository` domain interface with `getFavoriteStores`, `getFavoriteProducts`, `addFavoriteStore`, `removeFavoriteStore`, `addFavoriteProduct`, and `removeFavoriteProduct` in src/features/favorites/domain/repositories/FavoritesRepository.ts
- [ ] T054 [US3] Implement `SupabaseFavoritesRepository` querying `favorite_stores` and `favorite_products` with TanStack Query cache invalidation in src/features/favorites/infrastructure/SupabaseFavoritesRepository.ts
- [ ] T055 [P] [US3] Implement `FavoriteButton` presentation component with heart icon toggle for stores and products in src/features/favorites/presentation/FavoriteButton.tsx
- [ ] T056 [P] [US3] Implement Favorite Stores screen listing customer's favorited restaurants and markets in src/app/(customer)/favorites/stores.tsx
- [ ] T057 [P] [US3] Implement Favorite Products screen listing customer's favorited products in src/app/(customer)/favorites/products.tsx
- [ ] T058 [US3] Integrate `FavoriteButton` into `StoreCard` in src/features/restaurants/presentation/StoreCard.tsx and `ProductCard` in src/features/products/presentation/ProductCard.tsx
- [ ] T059 [US3] Add Favorite Stores and Favorite Products navigation links to Customer Profile screen in src/app/(customer)/profile.tsx

**Checkpoint**: At this point, User Stories 1, 2, 5, and 3 are all functional independently.

---

## Phase 7: User Story 4 - Promotions and Coupons (Priority: P3)

**Goal**: Display active promotional banners on the home screen that navigate to promoted stores or products. Allow customer to apply at most one coupon code at checkout, validated server-side via `validate_coupon` RPC, with authoritative discount reflected in the total.

**Independent Test**: Load home screen; verify promotional banners appear. Tap banner; verify promoted stores or products are displayed. In checkout, apply valid coupon ("SAVE10") and verify server discount is applied; apply replacement coupon ("SAVE20") and verify it replaces previous coupon; enter invalid coupon and verify rejection reason is displayed with zero discount.

### Implementation for User Story 4

- [ ] T060 [P] [US4] Define `Promotion` domain entity with `targetType: 'store' | 'product'` and `targetIds: string[]` in src/features/promotions/domain/entities/Promotion.ts
- [ ] T061 [P] [US4] Define `Coupon`, `CouponValidationContext` with standardized `addonIds: string[]`, and `CouponValidationResult` domain entities in src/features/promotions/domain/entities/Coupon.ts
- [ ] T062 [P] [US4] Define `PromotionRepository` domain interface with `getActivePromotions()` and `getPromotionTargetItems(promotionId: string)` in src/features/promotions/domain/repositories/PromotionRepository.ts
- [ ] T063 [P] [US4] Define `CouponRepository` domain interface with `validateCoupon(context: CouponValidationContext): Promise<CouponValidationResult>` in src/features/promotions/domain/repositories/CouponRepository.ts
- [ ] T064 [US4] Implement `SupabasePromotionRepository` querying `promotions` and `promotion_targets` in src/features/promotions/infrastructure/SupabasePromotionRepository.ts
- [ ] T065 [US4] Implement `SupabaseCouponRepository` invoking `validate_coupon` stored procedure with centralized camelCase `addonIds` to snake_case `addon_ids` mapping in src/features/promotions/infrastructure/SupabaseCouponRepository.ts
- [ ] T066 [P] [US4] Implement `PromoBannerCarousel` presentation component explicitly rendering `null` (collapsing section per FR-011 graceful degradation) when promotions query is empty or in error state in src/features/promotions/presentation/PromoBannerCarousel.tsx
- [ ] T067 [P] [US4] Implement `CouponInputSection` component with single-coupon replacement, server validation discount display, and rejection error message (BR-004, FR-013, FR-014) in src/features/promotions/presentation/CouponInputSection.tsx
- [ ] T068 [US4] Implement Promoted Items detail screen displaying stores or products linked to the promotion in src/app/(customer)/(home)/promotion/[id].tsx
- [ ] T069 [US4] Integrate `PromoBannerCarousel` into Home screen in src/app/(customer)/(home)/index.tsx
- [ ] T070 [US4] Integrate `CouponInputSection` and server-computed discount into Checkout screen in src/app/(customer)/checkout/index.tsx

**Checkpoint**: At this point, Promotions and Coupons work smoothly and strictly adhere to server authority.

---

## Phase 8: User Story 6 - Order-Scoped Driver Information (Priority: P4)

**Goal**: Customer can view driver name, photo, and phone strictly during active delivery fulfillment (`accepted`, `preparing`, `out_for_delivery`). Access is immediately revoked and hidden upon terminal status (`delivered`, `cancelled`, `rejected`).

**Independent Test**: View an active order accepted by a driver (status `accepted`, `preparing`, or `out_for_delivery`); verify driver name, photo, and phone are visible and no other driver profile data is exposed. Update order status to `delivered`, `cancelled`, or `rejected`; verify driver contact info is revoked and no longer displayed.

### Implementation for User Story 6

- [ ] T071 [P] [US6] Define `OrderDriverInfo` domain entity with `driverName: string`, `driverPhotoUrl: string | null`, and `driverPhone: string | null` in src/features/orders/domain/entities/OrderDriverInfo.ts
- [ ] T072 [P] [US6] Define `DriverInfoService` domain interface with `getOrderDriverInfo(orderId: string): Promise<OrderDriverInfo | null>` in src/features/orders/domain/services/DriverInfoService.ts
- [ ] T073 [US6] Implement `SupabaseDriverInfoService` invoking `get_order_driver_info` stored procedure in src/features/orders/infrastructure/SupabaseDriverInfoService.ts
- [ ] T074 [P] [US6] Define `OrderRealtimeService` domain interface for subscribing to order status changes in src/features/orders/domain/services/OrderRealtimeService.ts
- [ ] T075 [US6] Implement `SupabaseOrderRealtimeService` subscribing to Supabase Realtime channel and updating TanStack Query cache directly (`setQueryData`) per Principle IV & VIII in src/features/orders/infrastructure/SupabaseOrderRealtimeService.ts
- [ ] T076 [P] [US6] Implement `ScopedDriverCard` component rendering driver name, photo, and phone strictly during active fulfillment (`accepted`, `preparing`, `out_for_delivery`) and hiding upon `delivered`, `cancelled`, or `rejected` (BR-008, FR-021, FR-022) in src/features/orders/presentation/ScopedDriverCard.tsx
- [ ] T077 [US6] Integrate `ScopedDriverCard` and `OrderRealtimeService` into Customer Order Detail screen in src/app/(customer)/orders/[id].tsx

**Checkpoint**: All user stories are now complete and independently testable.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Route compatibility, consistent formatting, strict TypeScript verification, and end-to-end validation

- [ ] T078 [P] Update legacy restaurant route to forward or re-export store detail in src/app/(customer)/(home)/restaurant/[id].tsx
- [ ] T079 [P] Verify consistent currency formatting across all presentation components in src/shared/utils/formatting.ts
- [ ] T080 Run TypeScript type check and linter across the entire project via package.json scripts (`npm run lint`) to ensure zero errors and strict compliance
- [ ] T081 Execute end-to-end validation scenarios documented in specs/001-catalog-checkout-foundation/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - **User Story 1 (P1)**: Starts immediately after Foundational - Delivers complete MVP
  - **User Story 2 (P2)**: Can start after US1 cart is established or in parallel with US1 UI components
  - **User Story 5 (P2)**: Can start after Foundational phase; integrates into checkout flow
  - **User Story 3 (P3)**: Can start after Foundational phase; integrates into store and product cards
  - **User Story 4 (P3)**: Can start after Foundational phase; integrates into home screen and checkout
  - **User Story 6 (P4)**: Can start after Foundational phase; integrates into order tracking screen
- **Polish (Final Phase)**: Depends on all user stories being implemented

### Within Each User Story

- Domain entities and repository interfaces first (pure TypeScript)
- Infrastructure Supabase implementations second
- Presentation components third
- Screen integration fourth
- Checkpoint verification before declaring story complete

### Parallel Opportunities

- **Phase 1 (Setup)**: T001, T002, T003, T004 can run in parallel
- **Phase 2 (Foundational)**:
  - Database schema migrations T007, T008, T009, T010, T011 can be authored in parallel
  - RPC stored procedures T013, T014 can run in parallel
  - Domain entities T015, T016, T017, T018, T019 can all run in parallel
- **User Story Phases**:
  - Across stories: Once Phase 2 completes, US1, US2, US5, US3, US4, and US6 can proceed in parallel if multiple developers are available
  - Within US1: T020, T021, T022, T023, T024, T025, T027, T029, T030, T031, T032, T033 can run in parallel
  - Within US5: T044, T045, T047, T048 can run in parallel
  - Within US3: T052, T053, T055, T056, T057 can run in parallel
  - Within US4: T060, T061, T062, T063, T066, T067 can run in parallel
  - Within US6: T071, T072, T074, T076 can run in parallel

---

## Parallel Execution Examples

### Parallel Example: User Story 1 (Foundational Domain & Infrastructure)

```bash
# Author repository interfaces and utilities concurrently:
Task: "T020 [P] [US1] Define StoreRepository domain interface in src/features/restaurants/domain/repositories/StoreRepository.ts"
Task: "T022 [P] [US1] Define ProductRepository domain interface in src/features/products/domain/repositories/ProductRepository.ts"
Task: "T024 [P] [US1] Define CartItem and CartAddOnSelection interfaces in src/features/cart/domain/entities/CartItem.ts"
Task: "T025 [P] [US1] Implement generateCartItemId deterministic composite key in src/features/cart/domain/cartUtils.ts"
Task: "T027 [P] [US1] Define OrderRepository domain interface in src/features/orders/domain/repositories/OrderRepository.ts"
```

### Parallel Example: User Story 1 (Presentation Components)

```bash
# Build reusable UI widgets concurrently:
Task: "T029 [P] [US1] Implement StoreCard component in src/features/restaurants/presentation/StoreCard.tsx"
Task: "T030 [P] [US1] Implement CategoryTabBar component in src/features/restaurants/presentation/CategoryTabBar.tsx"
Task: "T031 [P] [US1] Implement ProductCard component in src/features/products/presentation/ProductCard.tsx"
Task: "T032 [P] [US1] Implement AddOnSelectorModal component in src/features/products/presentation/AddOnSelectorModal.tsx"
Task: "T033 [P] [US1] Implement CartItemRow component in src/features/cart/presentation/CartItemRow.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001 - T006)
2. Complete Phase 2: Foundational Prerequisites (T007 - T019)
3. Complete Phase 3: User Story 1 (T020 - T039)
4. **STOP and VALIDATE**: Run Scenario 1, Scenario 4, and Scenario 5 from `quickstart.md`
5. Deploy/demo the core catalog and checkout flow

### Incremental Delivery

1. **Increment 1 (MVP)**: Setup + Foundational + US1 → Customers can browse unified stores, customize products with add-ons, and place orders with immutable snapshots.
2. **Increment 2**: Add User Story 2 (T040 - T043) → Single-store cart conflict detection and prompt (no silent clearing).
3. **Increment 3**: Add User Story 5 (T044 - T051) → Reusable saved delivery address management.
4. **Increment 4**: Add User Story 3 (T052 - T059) → Store and product favorites.
5. **Increment 5**: Add User Story 4 (T060 - T070) → Home screen promo banners and server-validated coupons.
6. **Increment 6**: Add User Story 6 (T071 - T077) → Order-scoped driver contact details with status revocation.
7. **Increment 7**: Polish & Cross-Cutting (T078 - T081) → Linting, formatting, and end-to-end validation.

### Parallel Team Strategy

With multiple developers:
1. Team completes Phase 1 (Setup) and Phase 2 (Foundational) together.
2. Once Phase 2 is complete:
   - Developer A implements User Story 1 (Catalog, Cart, Checkout)
   - Developer B implements User Story 5 (Saved Delivery Addresses)
   - Developer C implements User Story 3 (Favorites)
   - Developer D implements User Story 4 (Promotions & Coupons)
3. Developer A and B integrate US2 (Single-Store Conflict) and US6 (Driver Info).
4. Full team executes Polish phase and scenario tests.

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks
- `[Story]` label maps each task to a specific user story for full traceability
- Each user story is independently completable and testable
- All tasks specify exact, unambiguous file paths
- Commit after each task or logical task cluster
- Server is authoritative for prices, discounts, and availability per Constitution Principle V
