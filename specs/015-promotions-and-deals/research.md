# Research: Dynamic Promotional Banners & Product Exclusive Deals

**Feature**: `015-promotions-and-deals`  
**Date**: 2026-10-24  
**Status**: Completed  

---

## 1. Auto-Sliding Promotional Banner Carousel

### Decision
Implement `PromoBannerCarousel` using React Native's core `FlatList` with `pagingEnabled`, `showsHorizontalScrollIndicator={false}`, `viewabilityConfig` (or `onMomentumScrollEnd`) for tracking active slide index, and a 3.5s (`3500ms`) timer that pauses on touch interactions (`onTouchStart`, `onTouchEnd`, `onScrollBeginDrag`, `onMomentumScrollEnd`).

### Rationale
- Zero additional native dependency: Expo SDK 57 has native `FlatList` optimized with virtualized scrolling. Avoids third-party carousel libraries (`react-native-snap-carousel` is deprecated; `react-native-reanimated-carousel` introduces complex gesture handler interactions in RTL environments).
- Native 60fps paging: `pagingEnabled={true}` with `snapToInterval` ensures crisp slide snapping.
- Seamless RTL support: Handles Arabic RTL direction naturally using standard flexbox and `I18nManager`.
- Touch pause: A simple ref-backed timer with `isPaused` flag ensures the user can inspect a banner without the carousel sliding away beneath their finger.
- Pagination dots: Displayed right below the banner strip, rendering an elongated pill (20px width, brand primary color) for the active slide and circular dots (6px width, muted gray) for inactive slides.

### Alternatives Considered
- `react-native-snap-carousel`: Abandoned by maintainers, causes TypeScript and React 19 compatibility issues.
- Third-party animated swipers: Introduce bloated dependencies and potential gesture conflicts with the outer home `ScrollView`.

---

## 2. Database Schema & Deal Classification Strategy

### Decision
1. **Promotions Table Update**:
   - Add nullable column `store_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL;`.
   - Update `target_type` constraint to allow `'store'`, `'product'`, or `'announcement'` / `'none'`.
   - If `store_id IS NOT NULL`, tapping the banner navigates to `/store/[store_id]`.
   - If `store_id IS NULL`, tapping the banner is a no-op (informational announcement).
2. **Products Table Update**:
   - Add column `original_price INTEGER CHECK (original_price IS NULL OR original_price > 0);` (in piasters, same unit as `price`).
   - Add generated column:
     ```sql
     ALTER TABLE public.products 
     ADD COLUMN IF NOT EXISTS is_deal BOOLEAN 
     GENERATED ALWAYS AS (original_price IS NOT NULL AND original_price > price) STORED;
     ```
   - Add partial index:
     ```sql
     CREATE INDEX IF NOT EXISTS idx_products_active_deals 
     ON public.products (restaurant_id, is_available) 
     WHERE is_deal = true AND is_available = true;
     ```

### Rationale
- **PostgREST Column Comparison Limitation**: PostgREST / Supabase JS cannot evaluate dynamic column-to-column expressions like `.gt('original_price', 'price')` directly in client filter syntax (it treats `'price'` as a string literal).
- **Sub-millisecond Query Performance**: A stored generated column `is_deal` accompanied by a partial index on `(restaurant_id, is_available) WHERE is_deal = true` allows standard PostgREST queries `.eq('is_deal', true)` to execute instantly via index scans without scanning non-deal rows.
- **Server Authority (Constitution Principle V)**: The database guarantees that only products where `original_price > price` are classified as deals. Tampering or invalid inputs are rejected or ignored.

### Alternatives Considered
- Client-side filtering: Fetching all products and filtering in JavaScript would download megabytes of catalog data to mobile devices over cellular networks, violating performance requirements.
- Postgres View or Custom RPC: Works, but a generated stored column with partial index integrates natively with standard Supabase client methods (`.from('products').select(...)`) and fits existing repository abstractions without custom RPC boilerplate.

---

## 3. Product Deals Scoping & Area Enforcement

### Decision
Deals shown on both the home screen carousel and the dedicated deals page are strictly scoped to the customer's `selectedAreaId`. The query joins `products` with `restaurants` using Supabase relation syntax:
```typescript
supabase
  .from('products')
  .select(`
    id,
    restaurant_id,
    category_id,
    name,
    description,
    price,
    original_price,
    image_url,
    is_available,
    created_at,
    restaurants!inner (
      id,
      name,
      rating,
      is_open,
      area_id,
      department_id
    )
  `)
  .eq('is_deal', true)
  .eq('is_available', true)
  .eq('restaurants.area_id', areaId)
```
- If the customer has not selected an area, the deals section renders an empty state prompting area selection or collapses cleanly.
- Top 10 deals are fetched for the home carousel (`limit(10)`).
- Full catalog deals are fetched for the dedicated deals page (`/deals`), with optional client/server department filtering.

### Rationale
- Guarantees SC-005 (0% of deal products shown belong to stores outside delivery area).
- Fetches product data and merchant attribution in a single round-trip.

---

## 4. UI Card Architecture: 3:4 Vertical Card vs Horizontal Card

### Decision
1. **New Component `DealProductCard`**:
   - Fixed 3:4 aspect ratio (width: height = 3:4, e.g., width 160dp x height 213dp in carousel, or dynamic width `(windowWidth - 36) / 2` in 2-column grid).
   - Elements:
     - Top Image with green percentage badge (`خصم 20%`) pinned to top right (RTL), and `FavoriteButton` pinned to top left.
     - Body: Product Name (1-2 lines bold), Store Name (muted caption), Rating pill (★ 4.8), Price section (`~~365.0 ج.م~~` strikethrough next to `339.0 ج.م` bold).
     - OnPress: Navigates to `/product/[id]`.
2. **Preserving Existing Components**:
   - Existing `ProductCard` (rounded 20px horizontal card) and `ProductRow` (menu list item) remain intact.
   - Both are augmented to render strikethrough original price and a compact discount badge whenever `product.originalPrice > product.price`.
   - `src/app/product/[id].tsx` is augmented in its price header to display the strikethrough original price and discount percentage badge.

### Rationale
- Meets user requirement: "هنحتاج برضو نعمل شكل card للمنتج بنفس المقاس اللي في للصوره 3x4 ومش هنلغي الشكل القديم كل واحد هيكون ليه استخدامه".
- High visual impact: 3:4 vertical cards give a rich e-commerce deal experience on the home screen while preserving clean horizontal list density in restaurant menus.

---

## 5. TanStack Query State Ownership & Cache Keys

### Decision
In accordance with Constitution Principle IV (State Ownership Is Never Duplicated):
- `['promotions', 'active']`: Active banners carousel (`staleTime: 5 * 60 * 1000`).
- `['products', 'deals', areaId, departmentId]`: Exclusive deals query (`staleTime: 2 * 60 * 1000`).
- No server data is duplicated into Redux Toolkit.
- Real-time updates / invalidations target these query keys directly.
