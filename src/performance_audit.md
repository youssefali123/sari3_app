# Sari3 — Performance & Responsiveness Audit Report

## Executive Summary

The Sari3 codebase is architecturally sound with good separation of concerns (domain/application/infrastructure/presentation), proper use of TanStack Query for server state, Redux Toolkit for cart state, and a comprehensive motion/animation system via Reanimated. However, several **high-impact performance issues** exist that directly affect user-perceived responsiveness, particularly on Android mid-range devices.

The most impactful issues, ordered by severity:

| Priority | Finding | Impact |
|----------|---------|--------|
| 🔴 Critical | **All images use `react-native` `Image` instead of `expo-image`** | Image loading/caching/scrolling jank on every image-heavy screen |
| 🔴 Critical | **Store detail product list uses ScrollView + .map() instead of FlatList** | No virtualization — all products render at once, causing jank and memory bloat |
| 🟠 High | **Home screen store list uses ScrollView + .map() instead of FlatList** | Same virtualization issue; all stores render simultaneously |
| 🟠 High | **`createStyles(theme)` called inside render on 23+ components** | Recreates StyleSheet objects on every render, GC pressure |
| 🟠 High | **Category pills compute `products.filter()` per category on every render** (store detail) | O(categories × products) per render |
| 🟡 Medium | **`FavoriteButton` inside every `StoreCard` and `PopularStoreCard` issues independent TanStack Query** | N+1 network pattern — each card fires its own favorites query |
| 🟡 Medium | **Cart selectors `selectCartSubtotal` recompute on every dispatch** | Not memoized with `createSelector` |
| 🟡 Medium | **ProductRow, StoreCard, PopularStoreCard not memoized** | Re-render on every parent update |
| 🟡 Medium | **Home screen `new Date().getHours()` greeting not memoized properly** | Empty `useMemo` dependency array — never updates |
| 🟢 Low | **Repository instances duplicated across screens** | Minor extra memory; not performance-critical |
| 🟢 Low | **Commented-out code in `supabase.ts`** | Code hygiene |

---

## Phase-by-Phase Findings

### Phase 1: Baseline Established

- **Tech stack confirmed**: Expo SDK 57, React 19.2.3, RN 0.86.3, Reanimated 4.5.1, FlashList 2.0.2 (installed but unused), expo-image 57.0.4 (installed but unused)
- **React Compiler enabled** (`experiments.reactCompiler: true` in app.json) — this means the compiler handles many memoization cases automatically. Manual `React.memo` is less critical but still valuable for list items.
- **TypeScript**: `strict: true`, well-typed throughout
- **Navigation**: Expo Router with `(auth)`, `(customer)`, `(driver)` groups, proper role-based routing
- **State management**: Redux (cart + area), TanStack Query (server state), AuthContext
- **pnpm**: Configured as package manager

### Phase 2: Rendering Performance

#### F-001 — `createStyles(theme)` called inside render (High)
- **23+ components** call `createStyles(theme)` inside the component body
- `StyleSheet.create()` returns a new object reference every call
- **Impact**: Forces every child using these styles to receive new object references, preventing React's shallow-equality bailout
- **Root cause**: Theme-dependent styles were designed for flexibility but create GC churn
- **Fix**: Memoize with `useMemo` keyed to theme identity, or move static styles out and use dynamic values inline

#### F-002 — FavoriteButton N+1 query pattern (Medium)
- Each `FavoriteButton` fetches the full favorites list independently: `['favoriteStoreIds', customerId]`
- TanStack Query deduplicates within `staleTime` (30s default), but if multiple instances mount after cache is stale, multiple identical requests fire
- **Fix**: The query key is shared, so TanStack Query's built-in dedup mostly handles this. The real concern is when `staleTime` expires — all buttons refetch. Consider increasing `staleTime` for favorites to 5 minutes.

#### F-003 — Cart selectors not memoized (Medium)
- `selectCartSubtotal` and `selectCartItemCount` use inline `.reduce()` — they produce new values on every call even when cart hasn't changed
- With React Compiler active, this is partially mitigated, but `createSelector` from RTK would be more robust
- **Fix**: Convert to `createSelector`

### Phase 3: Scrolling & List Performance

#### F-004 — Store detail product list: ScrollView + .map() (Critical)
- [store/[id].tsx](file:///home/youssef/Documents/sari3_improve_ui/sari3-app3/src/app/(customer)/(home)/store/[id].tsx#L351-L360): `filteredProducts.map((product) => <ProductRow ... />)` inside a `ScrollView`
- **No virtualization** — every product renders and mounts simultaneously
- A store with 50+ products loads all 50 ProductRow components at once
- Each ProductRow contains an `Image` component (RN Image, no caching), a Reanimated press animation hook, and theme calls
- **Impact**: Janky scroll, high JS thread load, excessive memory on product-heavy stores
- **Fix**: Replace with `FlatList` or `FlashList` (already installed). Add `React.memo` to `ProductRow`.

#### F-005 — Home screen store list: ScrollView + .map() (High)
- [index.tsx](file:///home/youssef/Documents/sari3_improve_ui/sari3-app3/src/app/(customer)/(home)/index.tsx#L377-L385): `filteredStores.map((store) => <StoreCard ... />)` inside the main `ScrollView`
- Same virtualization issue — all stores render simultaneously
- **Impact**: Slower initial render of home screen, wasted memory
- **Note**: This is inside the main `ScrollView` which also contains banner, categories, promo strip etc. Converting to FlatList `ListHeaderComponent` pattern would solve this.

#### F-006 — Browse screen: FlatList with entrance animation wrapper (Low risk)
- [browse.tsx](file:///home/youssef/Documents/sari3_improve_ui/sari3-app3/src/app/(customer)/(home)/browse.tsx#L113-L127): Uses `FlatList` correctly, but wraps each item in a `ListRow` component that calls `useEntranceAnimation` hook — this is fine since each item is already virtualized

#### F-007 — FlashList installed but unused
- `@shopify/flash-list` 2.0.2 is in `package.json` but no import exists in the codebase
- Could be used for the highest-traffic lists (stores, products) for better recycling performance

### Phase 4: Navigation & Transitions

- Navigation structure is clean and well-organized
- Screen transitions use `screenTransitions.horizontal` — Reanimated-based, running on UI thread
- Auth guards are properly implemented with `useRequireAuth` and early returns
- **No issues found** requiring immediate action

### Phase 5: Supabase & Network

#### F-008 — Category count computed during render (Medium)
- [store/[id].tsx line 299](file:///home/youssef/Documents/sari3_improve_ui/sari3-app3/src/app/(customer)/(home)/store/[id].tsx#L298-L299): `products.filter((p) => p.categoryId === cat.id).length` is computed inline inside `.map()` for each category pill
- Runs O(categories × products) on every render
- **Fix**: Precompute category counts in a `useMemo`

#### F-009 — Home screen fetches all orders to extract "last order" (Low)
- [index.tsx line 91-95](file:///home/youssef/Documents/sari3_improve_ui/sari3-app3/src/app/(customer)/(home)/index.tsx#L91-L95): Fetches all customer orders just to show the last one
- TanStack Query caches this, but the initial payload could be large for active customers
- **Impact**: Low — caching and the `enabled` guard mitigate this. A dedicated RPC would be ideal long-term.

### Phase 6: Images & Assets

#### F-010 — `expo-image` installed but unused (Critical)
- `expo-image` v57.0.4 is in `package.json` but **zero imports** exist in the source
- All 11+ image-displaying components use `react-native`'s `Image`
- RN `Image` has no built-in disk caching, no progressive loading, no blur hash, and worse performance on Android
- **Impact**: Every image-heavy screen suffers — store cards, product rows, hero images, cart items, search results, favorites
- **Fix**: Migrate high-traffic image components to `expo-image`'s `Image` component

### Phase 7: Startup & Lifecycle

- Startup flow is well-designed: native splash → animated AppSplashScreen → navigation mount
- Font loading, auth restoration, and safety timeout are properly sequenced
- `initializeCartPersistence()` runs at module scope (good — early)
- Cart persistence subscribe/serialize pattern with dedup is efficient
- **No critical issues** — the 1.5s minimum + 4.5s safety timeout is reasonable

### Phase 8: UX & Responsiveness

- Good RTL support with `row-reverse` patterns throughout
- Proper safe area handling
- Loading skeletons used appropriately
- Empty states and error states well-designed
- Touch targets are adequate (32-44px minimum)
- `unstable_pressDelay={0}` used correctly for instant press feedback

### Phase 9: Bundle & Dependencies

- No unused heavy dependencies found (all installed packages are used or accounted for)
- FlashList and expo-image are installed but unused — should be leveraged

### Phase 10: TypeScript & Code Quality

- Code is well-typed with `strict: true`
- Consistent architecture patterns
- Clean domain entity types
- The `useColors` catch fallback (line 13-15) conditionally calls hooks — technically a Rules of Hooks violation, though benign in practice

---

---

### Batch 1: Image Performance (Critical — Highest Impact) [COMPLETED]
- Migrated 14+ components from `react-native` `Image` to `expo-image`
- Configured with `cachePolicy="memory-disk"` for cross-session disk caching
- Set `transition={null}` for rapidly scrolling lists (prevents flicker/jank during recycling)
- Set subtle `transition={150-200}` for hero images and avatars
- Verified: `ProductRow`, `ProductCard`, `StoreCard`, `PopularStoreCard`, `CartItemRow`, `FavoriteProductCard`, `FavoriteStoreCard`, `ProductResultRow`, `StoreResultRow`, `Avatar`, `ScopedDriverCard`, `PromoBannerCarousel`, store detail hero, product detail hero

### Batch 2: Store Detail List Virtualization (Critical) [COMPLETED]
- Replaced unvirtualized `filteredProducts.map(...)` inside `ScrollView` with tuned `FlatList`
- Integrated Store Hero, Store Info Card, Closed Banner Warning, Category Filter Pills, and Menu Section Title into `ListHeaderComponent`
- Eliminated nested vertical scroll container conflicts
- Preserved horizontal category scrolling
- Precomputed category product counts via `useMemo` (O(N) instead of O(N × categories))
- Tuned windowing: `initialNumToRender={8}`, `maxToRenderPerBatch={10}`, `windowSize={7}`, `removeClippedSubviews={Platform.OS === 'android'}`

### Batch 3: Home Screen List Virtualization (High) [COMPLETED]
- Replaced unvirtualized `filteredStores.map(...)` inside `ScrollView` with tuned `FlatList`
- Separated `SearchResultsList` from ScrollView, eliminating the React Native nested VirtualizedList warning
- Integrated Banner, Category Tiles, SearchBar, Promo Strip, Popular Stores Carousel, and Section Title into `ListHeaderComponent`
- Integrated Last Order and Area Empty states into `ListFooterComponent`
- Added native pull-to-refresh (`onRefresh={refetchStores}`)
- Wrapped `StoreCard` and `PopularStoreCard` in `React.memo` with memoized callbacks

### Batch 4: Rendering & State Optimization (High / Medium) [COMPLETED]
- Converted Redux cart selectors (`selectCartItemCount`, `selectCartSubtotal`) to `createSelector`
- Fixed `useColors` Rules of Hooks violation by calling `useContext` and `useColorScheme` unconditionally
- Fixed `(driver)/_layout.tsx` hook order violation by moving `useTheme` above early returns
- Optimized `FavoriteButton`:
  - Added fine-grained TanStack Query `select` selector `(ids) => ids.includes(targetId)` so only the toggled button re-renders
  - Increased `staleTime` from 30s to 5m (300_000ms) with 10m `gcTime`
  - Added optimistic cache updates with rollback on error
  - Wrapped `FavoriteButton` in `React.memo`
- Memoized list items with `React.memo`: `ProductRow`, `StoreCard`, `PopularStoreCard`, `CartItemRow`, `FavoriteProductCard`, `FavoriteStoreCard`, `RatingPill`, `OptionRow`, `QuantitySelector`
- Memoized `createStyles(theme)` with `useMemo` in high-traffic render paths

### Batch 5: Secondary Screens & List Items Optimization [COMPLETED]
- Memoized list items with `React.memo`: `ProductCard`, `OrderSummaryCard`, `AvailableOrderCard`, `DeliveryHistoryCard`, `AddressCard`.
- Added native Pull-to-refresh (`refreshing={false}`, `onRefresh={refetch}`) across:
  - Customer Orders screen (`orders/index.tsx`)
  - Order Detail/Tracking screen fallback (`orders/[id].tsx`)
  - Category Browse screen (`browse.tsx`)
  - Driver Available Orders screen (`available-orders/index.tsx`)
  - Promotion detail screen (`promotion/[id].tsx`)
- Modernized `promotion/[id].tsx` with full Arabic copy, `AppScreen`, `BrandHeader`, and theme tokens.
- Optimized Cart (`cart.tsx`): converted manual `reduce` to `selectCartItemCount` and made styles static.
- Optimized Checkout (`checkout.tsx`): memoized `createStyles(theme)` and fixed back handler hook dependencies.
- Tuned windowing parameters for secondary FlatLists (`initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews`).
- **Order History Scroll Lag Resolution** (`orders/index.tsx` & `OrderSummaryCard.tsx`):
  - Removed Reanimated `usePressAnimation` overhead from `OrderSummaryCard` (eliminating 3 shared values/worklets per card).
  - Replaced inline anonymous callbacks with stable `useCallback` references (`handleOpenOrder`, `handleOrderAgain`, `handleHideOrder`, `renderItem`, `keyExtractor`), making `React.memo` actually bail out of re-rendering past order cards during scroll.
  - Memoized `formatDateTime` and `formatCurrency` per card to eliminate Hermes `Intl` string allocation during scrolling.
  - Tuned `FlatList` with `initialNumToRender={8}`, `maxToRenderPerBatch={10}`, `windowSize={7}`, `removeClippedSubviews={false}`.

### Verification & Validation
- **TypeScript**: `tsc --noEmit` passed with 0 errors across entire project.
- **ESLint**: 0 errors, 0 warnings on all modified files.
- **Rules of Hooks**: Validated and resolved all hook order and conditional hook issues.
- **Architecture**: RTL Arabic typography, Supabase RLS security boundaries, role authentication, and domain contracts strictly preserved.


