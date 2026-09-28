# Tasks: Product Detail Screen

**Feature**: `007-product-detail-screen`
**Plan**: presentation-layer only — no domain/infrastructure/schema changes.
**Tests**: runnable scenarios in this file + `npx tsc --noEmit` + `npm run lint`.

---

## Phase 1: Screen Implementation

- [x] T001 Create `src/app/product/[id].tsx`: full-screen product page — image, name, price, description, FavoriteButton, share icon (plain-text share via `Share.share`), variant selection (carried over from AddOnSelectorModal), add-on selection (carried over), quantity stepper (NEW UI, 1–99), sticky "Add to Cart"
- [x] T002 Data fetching on the screen: `getProductById(id)` for the product (not-found → "no longer available" state with back action); `getVariantsByProductId(id)` for variant products; parent store via `getStoreById(product.storeId)` for the closed-store check (FR-008)
- [x] T003 Extract the reusable add-on/variant selection UI from AddOnSelectorModal into a presentation component consumed by the new screen (same checkbox/toggle rendering, variant chips, running price composition) — the screen hosts it; the modal file is deleted
- [x] T004 Quantity stepper: NEW presentation UI (the modal fixed quantity at 1); "Add to Cart" dispatches the cart item with the chosen quantity via the existing cart slice
- [x] T005 "Add to Cart": build the CartItem with the existing `generateCartItemId(productId, variantId, addonIds)` and variant/base + add-on price composition; route through the existing `useAddToCart().addItemWithConflictCheck` (single-store conflict prompt, unchanged); disable when store closed (FR-008), product `isAvailable = false` (FR-009), or a variant is required but unselected
- [x] T006 FavoriteButton integration: render for the product (`kind="product"`), existing guest sign-in behavior unchanged

## Phase 2: Entry Points & Modal Removal

- [x] T007 Update store-detail tap handler in `src/app/(customer)/(home)/store/[id].tsx`: ProductCard `onPress` navigates to `/product/${item.id}`; remove `productForModal` state, the modal usage, and the add-ons/variants queries that fed it
- [x] T008 Update Favorite Products tap handler in `src/app/(customer)/favorites/products.tsx`: navigate to `/product/${item.id}` (was: navigate to the parent store screen)
- [x] T009 Delete `src/features/products/presentation/AddOnSelectorModal.tsx` and verify zero remaining imports/references (SC-001)

## Phase 3: Validation

- [x] T010 Run `npx tsc --noEmit` and `npm run lint`; fix any fallout from the modal removal
- [ ] T011 Validate Scenarios 1–9 from spec.md on the running app (web + dev build): screen from store browsing, cart-item parity with the modal, favorites entry point, conflict prompt, closed-store disable, deleted-id state, `isAvailable = false` state, guest flow, and zero `AddOnSelectorModal` references

## Notes

- Presentation-layer only: no domain entities, no infrastructure, no schema changes.
- The modal's internal logic (add-on checkbox/toggle, variant chips, price composition) moves into the screen's component tree — reused, not rewritten.
- The quantity stepper is the only genuinely NEW UI logic (the modal hardcoded quantity: 1).
- Search (future feature) will navigate here; its future spec must reference `/product/[id]` — no search spec exists today to update.
