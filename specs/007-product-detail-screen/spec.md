# Feature Specification: Product Detail Screen

**Feature Branch**: `007-product-detail-screen`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description: dedicated full-screen product detail page replacing the AddOnSelectorModal-based product configuration flow. Presentation-layer change to the shipped catalog-checkout-foundation feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dedicated Product Screen From Store Browsing (Priority: P1)

A customer browsing a store's menu taps a product card. Instead of the previous bottom-sheet configuration modal, the app navigates to a dedicated full-screen product page at `/product/[id]`: large product image on top, product name, price, description, the size/variant selection (for variant products), the add-on selection UI, a quantity stepper, and a sticky "Add to Cart" button at the bottom. A FavoriteButton for the product is present. The back action returns to the store screen via normal stack navigation.

**Why this priority**: This is the core replacement — the modal flow is removed entirely and this screen becomes the single path to configure and add a product.

**Independent Test**: Tap a product in a store → the dedicated screen opens (not a modal) with the same add-on/variant selection behavior as before; configure and add → the cart item is identical to what the modal produced.

**Acceptance Scenarios**:

1. **Given** a customer is browsing a store, **When** they tap a product card, **Then** the dedicated product screen opens with image, name, price, description, variant selection (if any), add-on selection, quantity stepper, and a sticky "Add to Cart" button.
2. **Given** the customer configures add-ons (and a variant for variant products), **When** they tap "Add to Cart", **Then** the resulting cart item uses the same composite key logic (`generateCartItemId(productId, variantId, addonIds)`) and the same price composition (variant price or base price + add-ons) as the modal produced.
3. **Given** the customer taps back, **Then** they return to the store screen they came from.

---

### User Story 2 - Product Screen From Favorites (Priority: P1)

Tapping a favorited product on the Favorite Products screen opens the same dedicated product screen directly (previously it navigated to the parent store screen).

**Why this priority**: Favorites are a directly-addressable product entry point; the modal flow could never serve them correctly.

**Independent Test**: Tap a favorited product on the Favorite Products screen → the product screen opens for that exact product.

**Acceptance Scenarios**:

1. **Given** a customer has a favorited product, **When** they tap it on the Favorite Products screen, **Then** the dedicated product screen opens for that product id.

---

### User Story 3 - Missing / Unavailable Product States (Priority: P1)

Because the route is now directly addressable (favorites today, search tomorrow), the screen must handle products that no longer exist or are no longer available:

- Product id not found (deleted) → a clear "this item is no longer available" state with a way to navigate back — never blank or crashing.
- Product exists but `isAvailable = false` → the product's details are shown but "Add to Cart" is disabled with a clear reason, consistent with how unavailability is communicated elsewhere.

**Why this priority**: Direct consequence of the route-based architecture; the modal flow never faced this because it was only opened from already-loaded valid products.

**Independent Test**: Open `/product/<deleted-id>` → a clear unavailable state; open a product with `isAvailable = false` → details visible, "Add to Cart" disabled with reason.

**Acceptance Scenarios**:

1. **Given** a product id that no longer exists, **When** the screen opens, **Then** a clear "this item is no longer available" state is shown with a back action — no blank screen or crash.
2. **Given** a product with `isAvailable = false`, **When** the screen opens, **Then** full details are shown and "Add to Cart" is disabled with a clear unavailability reason.

---

### User Story 4 - Store-Closed Carry-Over (Priority: P1)

If the product's parent store is closed, "Add to Cart" is disabled on this screen — identical to the closed-store behavior on the store-detail product list (catalog-checkout-foundation FR-024). The screen fetches the parent store (`product.storeId`) and applies the same rule; no new closed-store behavior is introduced.

**Acceptance Scenarios**:

1. **Given** the product's parent store is closed, **When** the screen opens, **Then** "Add to Cart" is disabled, consistent with the store-detail behavior.

---

### User Story 5 - Guest Support & Quantity (Priority: P2)

The screen works without authentication (guest browsing/add-to-cart is established app behavior). A quantity stepper lets the customer set quantity before adding (1–99); the resulting cart item carries the chosen quantity, using the cart's existing `updateQuantity` capability.

**Acceptance Scenarios**:

1. **Given** an unauthenticated guest opens the screen and taps "Add to Cart", **Then** the item is added exactly as guest add-to-cart works elsewhere.
2. **Given** the customer sets quantity to 3 before adding, **Then** the cart item is added with quantity 3.

---

## Edge Cases

- **Variant products**: a product with available variants requires a variant choice before "Add to Cart" is enabled — the exact behavior carried over from the modal (feature 005 variant pricing). The button is disabled until a variant is selected.
- **FavoriteButton for guests**: the existing FavoriteButton behavior for unauthenticated users carries over unchanged (it prompts sign-in); no special handling is added on this screen.
- **Share icon**: a share icon is displayed; it shares plain text (product name + price) via the OS share sheet. No deep links — universal links/App Links are out of scope for this feature.
- **Product store area**: the screen does not re-filter by the customer's selected browsing area — direct addressability via favorites/search means a customer may open a product outside their current area; the screen shows the product regardless (area filtering is a browsing concern, not a product-view concern).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a dedicated product detail screen at the route `src/app/product/[id].tsx` reachable from any product entry point.
- **FR-002**: The screen MUST display: product image (large, top), name, price, description, variant selection (for variant products, carried over from the modal), add-on selection (carried over from the modal), quantity stepper, and a sticky "Add to Cart" button.
- **FR-003**: The screen MUST include the existing FavoriteButton for the product, reused as-is.
- **FR-004**: A share icon MUST be displayed sharing plain text (product name + price) only; real deep-link sharing is out of scope.
- **FR-005**: Every entry point that previously opened AddOnSelectorModal, plus the Favorite Products tap, MUST navigate to this screen instead. AddOnSelectorModal MUST be removed as a reachable UI pattern (no dead parallel flow).
- **FR-006**: Add-on selection, variant selection, and price-calculation behavior MUST be carried over from AddOnSelectorModal's existing implementation — not reimplemented with diverging behavior. The quantity stepper is NEW UI (the modal fixed quantity at 1).
- **FR-007**: The "Add to Cart" action MUST produce cart items using the existing composite key logic (`generateCartItemId(productId, variantId, addonIds)`) and the existing single-store conflict prompt, unchanged.
- **FR-008**: If the product's parent store is closed, "Add to Cart" MUST be disabled, identical to catalog-checkout-foundation FR-024.
- **FR-009**: The screen MUST handle a nonexistent product id with a clear "no longer available" state and a back action, and MUST disable "Add to Cart" with a clear reason when `isAvailable = false`.
- **FR-010**: The screen MUST work without authentication (guest viewing and guest add-to-cart), matching established guest behavior.
- **FR-011**: The Favorite Products screen tap handler MUST navigate to this screen.

### Out of Scope

- Real deep-linkable external sharing (universal links / App Links).
- Product reviews/ratings, related products, multiple product photos (single image per current data model).
- Any domain, infrastructure, or schema change — presentation-layer only.

## Success Criteria *(mandatory)*

- **SC-001**: 100% of product entry points (store browsing, favorites, future search) navigate to the dedicated product screen; AddOnSelectorModal has zero reachable usages.
- **SC-002**: Cart items produced by this screen are byte-identical in key/price/quantity semantics to those the modal produced.
- **SC-003**: 100% of closed-store and unavailable-product states disable "Add to Cart" with clear reasons.
- **SC-004**: 100% of nonexistent product ids render the unavailable state — 0 blank/crashing renders.

## Assumptions

- Route placement `src/app/product/[id].tsx` (outside route groups) is intentional: the screen is reachable from customer, favorites, and future search contexts and renders full-screen without tab bars.
- The quantity stepper is new presentation UI; the cart's existing `updateQuantity` supports the resulting quantities.
- Guest FavoriteButton behavior carries over unchanged (sign-in prompt), matching all other favorite surfaces.
