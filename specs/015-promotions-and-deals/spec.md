# Feature Specification: Dynamic Promotional Banners & Product Exclusive Deals

**Feature Branch**: `015-promotions-and-deals`

**Created**: 2026-10-24

**Status**: Draft

**Input**: User description: "Dynamic Promotional Banners & Product Exclusive Deals"

## Clarifications

### Session 2026-10-24
- Q: Does the "عروض حصرية (تنتهي قريباً)" deals section require a dynamic real-time countdown timer, or is "(تنتهي قريباً)" a static visual label in v1? → A: Static urgency label — "(تنتهي قريباً)" is a visual text label in the header with no ticking clock timers in v1.
- Q: How many deal products should be displayed in the home screen horizontal carousel before the user taps the '<' chevron to view the full catalog? → A: Top 10 deals — show up to 10 deals in the home carousel to optimize performance and encourage tapping '<' for the full page.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-Sliding Promotional Banners on Home Screen (Priority: P1)

A customer opens the app and sees dynamic, high-resolution promotional banners sliding automatically beneath the greeting banner. The customer can swipe through them manually or watch them slide smoothly every 3.5 seconds. When the customer touches a banner, sliding pauses so they can view it comfortably. Tapping a store-sponsored banner opens that merchant's store page directly, while tapping an informational announcement banner triggers no navigation.

**Why this priority**: Banners are the primary visual hook and sponsored advertising surface at the top of the app, driving immediate customer interest and merchant visibility.

**Independent Test**: Can be tested independently by launching the home screen, observing auto-play progression and pagination dots update, swiping manually, tapping a merchant banner to open the store page, and tapping an announcement banner to verify no accidental navigation occurs.

**Acceptance Scenarios**:

1. **Given** there are active promotional banners in the database, **When** the customer views the home screen, **Then** the banners appear in an auto-sliding carousel beneath the yellow greeting banner and above the 6-department categories grid, accompanied by pagination indicator dots.
2. **Given** the carousel is auto-sliding, **When** the customer places a finger on the banner or drags to swipe, **Then** auto-sliding pauses immediately until the touch is released.
3. **Given** a banner is linked to a merchant (`store_id != null`), **When** the customer taps the banner, **Then** the app navigates directly to that merchant's store page (`/store/[id]`).
4. **Given** a banner has no merchant link (`store_id == null`), **When** the customer taps the banner, **Then** no navigation occurs and the user remains on the home screen.
5. **Given** an admin sets a banner's `is_active = false` or the banner expires, **When** the home screen refreshes, **Then** that banner is omitted from the carousel. If zero active banners exist, the banner section collapses gracefully with no blank space.

---

### User Story 2 - Product-Level Exclusive Deals Carousel on Home Screen (Priority: P1)

A customer browses the home screen and sees a dedicated "عروض حصرية (تنتهي قريباً)" section directly beneath the 6-department categories grid. The section features a horizontal scrollable strip of vertical 3:4 product cards. Each card clearly shows the product photo, an eye-catching green discount pill badge displaying the savings percentage (e.g., `خصم 20%`), the product name, the merchant/vendor name (e.g., "صيدلية چيمي", "دكان حمود"), the strikethrough original price next to the discounted price, the rating, and a favorite button. Tapping any card opens the product detail page.

**Why this priority**: Co-equal MVP with Story 1. Time-sensitive product deals with price anchoring and percentage badges drive immediate purchase intent and showcase vertical variety (pharmacies, groceries, restaurants).

**Independent Test**: Can be tested independently by viewing the home screen in an active delivery area, verifying that discounted items show correct strikethrough prices and percentage badges, and tapping a card to open its product detail screen.

**Acceptance Scenarios**:

1. **Given** there are discounted products (`original_price > price`) belonging to active stores in the customer's selected area, **When** the customer scrolls beneath the categories grid, **Then** the "عروض حصرية (تنتهي قريباً)" section displays those products in a horizontal carousel of 3:4 vertical cards.
2. **Given** a deal product with `original_price = 365.0` and `price = 339.0`, **When** rendered in the card, **Then** a green pill badge displays `خصم 7%`, the original price is rendered as struck through (`~~365.0 ج.م~~`), the active price is displayed prominently (`339.0 ج.م`), and the merchant name is displayed.
3. **Given** the customer taps any deal product card, **When** the press executes, **Then** the app navigates to that product's detail screen (`/product/[id]`).
4. **Given** the customer taps the heart icon on a deal card, **When** pressed, **Then** the product is toggled in the customer's favorites without navigating away from the home screen.
5. **Given** the customer changes their active delivery area, **When** the home screen updates, **Then** only deals from stores serving the newly selected area are displayed.

---

### User Story 3 - Dedicated Full-Screen Deals Page (Priority: P2)

A customer wants to see all active offers in their area. Tapping the chevron action icon (`<`) on the home screen deals header navigates to a dedicated full-screen "عروض حصرية" page. The customer sees all discounted products arranged in a responsive 2-column grid of 3:4 vertical cards, with search and department filtering tags.

**Why this priority**: Allows deep exploration of catalog-wide deals without cluttering the home screen.

**Independent Test**: Can be tested independently by tapping the `<` icon from the home deals header, confirming navigation to the deals page, filtering by department or search query, and verifying matching deal cards in a 2-column grid.

**Acceptance Scenarios**:

1. **Given** the customer is on the home screen, **When** they tap the `<` chevron icon in the "عروض حصرية" section header, **Then** the app navigates to the dedicated full-screen deals page with a back button.
2. **Given** the deals page is loaded, **When** rendered, **Then** all discounted products in the active area appear in a 2-column grid using the same 3:4 vertical deal card layout.
3. **Given** the customer selects a department filter tag (e.g., "صيدليات" or "سوبرماركت"), **When** selected, **Then** the grid filters immediately to show only discounted products from merchants in that department.
4. **Given** no deals match the search or filter in the active area, **When** rendered, **Then** a friendly empty state is displayed with an option to reset filters.

---

### User Story 4 - Catalog-Wide Pricing & Discount Consistency (Priority: P2)

A customer discovers a discounted product not from the home deals section, but by directly browsing a store's catalog (`/store/[id]`), searching, or viewing their favorites. The customer sees consistent discount indicators everywhere: the original price is struck through, the active sale price is shown, and a discount badge is displayed. When opening the product details (`/product/[id]`), the customer sees the same strikethrough price and savings summary.

**Why this priority**: Ensures single source of truth and customer trust. Discounts must not be superficial home-screen banners; they must be true product properties reflected across all touchpoints.

**Independent Test**: Can be tested independently by navigating into a merchant's store page that has discounted items, confirming the standard horizontal cards show strikethrough pricing and badge, and opening the product detail screen to verify price consistency.

**Acceptance Scenarios**:

1. **Given** a product has `original_price > price`, **When** viewed inside its merchant's store menu (`/store/[id]`), **Then** the standard horizontal product card displays the strikethrough original price, the active price, and a compact discount badge (e.g., `-20%`).
2. **Given** a discounted product is opened in the Product Detail Screen (`/product/[id]`), **When** rendered, **Then** the main price section displays the strikethrough original price alongside the discounted price and savings percentage.
3. **Given** a discounted product appears in search results or favorites, **When** rendered, **Then** its discount badge and strikethrough original price are displayed consistently.

---

### User Story 5 - Admin & Merchant Deal Configuration (Priority: P3)

An administrator or merchant sets up promotional banners and discounted products directly in the database. For banners, they configure image URLs, display order, active status, and optional store links. For products, setting `original_price` greater than `price` immediately activates deal status across the entire application without any app deployment.

**Why this priority**: Provides the operational capability to launch campaigns, manage merchant sponsorships, and adjust pricing dynamically.

**Independent Test**: Can be tested independently by inserting a new promotional banner with a store link in Supabase, updating a product's `original_price`, refreshing the app, and verifying both appear immediately.

**Acceptance Scenarios**:

1. **Given** an admin inserts a banner with an image URL and a merchant `store_id`, **When** the app opens, **Then** the banner appears in the top carousel and clicking it navigates to that merchant.
2. **Given** an admin sets a product's `original_price` higher than its `price`, **When** the product is fetched, **Then** the product automatically qualifies as an exclusive deal with dynamic percentage calculation.
3. **Given** an admin removes or lowers `original_price` to equal or less than `price`, **When** refreshed, **Then** the product reverts to a regular non-discounted product without badges or strikethrough.

---

### Edge Cases

- **What happens when there are no active promotional banners?** The top banner section collapses completely, and the greeting banner sits directly above the categories grid with no gap or layout shift.
- **What happens when there is only 1 promotional banner?** The carousel renders that single banner statically without auto-sliding or unnecessary pagination dots.
- **What happens when `original_price` is less than or equal to `price`?** The system treats it as an invalid/inactive discount and renders the product as a standard item with normal single-price formatting (no strikethrough or negative badges).
- **What happens if a banner's image URL fails to load?** A themed fallback placeholder is rendered, preventing broken layout or white flashes.
- **What happens when the customer has no area selected?** Banners still display (they can be global), but the deals section prompts area selection or remains empty until an area is chosen, ensuring out-of-range delivery items are never displayed.
- **What happens when an odd number of products are displayed on the deals page?** The 2-column grid renders the final item at standard single-column width without stretching across both columns.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display an auto-sliding promotional banner carousel on the home screen directly beneath the static yellow greeting banner and above the 6-department categories grid.
- **FR-002**: Banners MUST auto-slide every 3.5 seconds when active, pausing immediately upon user touch/drag interaction and resuming when touch is released.
- **FR-003**: The banner carousel MUST display real-time pagination indicator dots beneath the banners, featuring an elongated pill shape in brand primary color for the active slide and circular gray dots for inactive slides.
- **FR-004**: Each banner MUST support an optional merchant association (`store_id`). If provided, tapping the banner MUST navigate to `/store/[id]`. If null, tapping MUST trigger no navigation.
- **FR-005**: System MUST support an `original_price` attribute on products. A product is classified as an active deal when `original_price` is present and strictly greater than `price`.
- **FR-006**: System MUST calculate discount percentage dynamically as $\text{Math.round}\left(\frac{\text{original\_price} - \text{price}}{\text{original\_price}} \times 100\right)$ and display it on the deal badge (e.g., `خصم 20%`).
- **FR-007**: Home screen MUST display an "عروض حصرية (تنتهي قريباً)" section directly beneath the 6-department categories grid, rendering up to the top 10 active deal products in a horizontal carousel. The "(تنتهي قريباً)" indicator is rendered as a static visual urgency label without ticking real-time clock countdown timers in v1.
- **FR-008**: Home deals section MUST filter products strictly by the customer's `selectedAreaId`, displaying only items from active stores delivering to that area.
- **FR-009**: System MUST implement a dedicated `DealProductCard` component adhering strictly to a 3:4 vertical aspect ratio, featuring product image, green percentage discount badge, product name, merchant attribution name, strikethrough original price, active discounted price, star rating, and favorite toggle button.
- **FR-010**: Tapping a `DealProductCard` MUST navigate to the Product Detail Screen (`/product/[id]`).
- **FR-011**: Existing horizontal product components (`ProductCard`, `ProductRow`) MUST be preserved for store catalogs, search results, and favorites, and MUST be updated to show the strikethrough original price and compact discount badge when a discount exists.
- **FR-012**: Product Detail Screen (`/product/[id]`) MUST display the strikethrough original price, active price, and discount percentage badge in its primary price header when discounted.
- **FR-013**: Tapping the chevron icon (`<`) on the home deals header MUST navigate to a dedicated full-screen deals page (`/(customer)/(home)/offers` or `deals`).
- **FR-014**: The dedicated deals page MUST render discounted products in a responsive 2-column grid using `DealProductCard`, with search input and department filter tags.
- **FR-015**: Promotional banners and deals data MUST be cached and managed via TanStack Query following stale-while-revalidate patterns without server state duplication in global client stores.

---

### Key Entities

- **Promotional Banner**: Represents a sponsored merchant advertisement or general platform announcement displayed in the top carousel (`id`, `image_url`, `store_id` (nullable), `is_active`, `display_order`, `starts_at`, `expires_at`).
- **Product (Extended)**: Catalog item extended with `original_price` (in piasters, nullable). Serves as the single source of truth for base and discounted pricing across the entire app.
- **Deal**: A transient view or domain representation of a product having `original_price > price`, enriched with merchant name, merchant rating, and calculated discount percentage.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers see the promotional banner carousel slide smoothly within 100ms of home screen initial render using cached data.
- **SC-002**: 100% of banners linked to merchants navigate to the exact store page in under 500ms transition time upon tapping.
- **SC-003**: 100% of products with `original_price > price` correctly display their calculated discount percentage and strikethrough price across all 4 app touchpoints (home deals carousel, deals page, store catalog, and product detail screen).
- **SC-004**: Swiping through the deals carousel or deals page maintains a steady 60fps frame rate without noticeable stutter or image pop-in.
- **SC-005**: 0% of deal products shown to the customer belong to stores outside their selected delivery area.

---

## Assumptions

- The static yellow hero greeting banner ("ماذا تريد اليوم؟") is retained at the top of the home screen, and the new auto-sliding promotional banners carousel is placed directly underneath it.
- Existing horizontal product cards (`ProductCard` and `ProductRow`) remain the standard for menus, lists, and favorites; the new 3:4 vertical card (`DealProductCard`) is an addition created specifically for carousels and 2-column grids.
- Discount calculations are integer-based in piasters (e.g., 36500 piasters = 365.0 EGP).
- Banners without a `store_id` are informational and deliberately have no click-through destination.
- RTL layout is the default; all chevrons, text alignments, and swipe directions conform to Arabic RTL standards.
