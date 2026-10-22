# Contract: Cart Price & Availability Revalidation

**Feature Branch**: `012-error-handling-resilience`  
**Date**: 2026-10-22  
**Spec**: [specs/012-error-handling-resilience/spec.md](../spec.md)

---

## 1. Scope & Intent
Specifies the interface and lifecycle for revalidating cart items against live catalog prices and availability prior to checkout confirmation (FR-019, FR-020, FR-021). Reuses the catalog querying logic established in `useReorder` (FR-027).

---

## 2. Interface Definition

```typescript
// src/features/cart/application/hooks/useCartRevalidation.ts
export interface UseCartRevalidationResult {
  readonly isRevalidating: boolean;
  readonly revalidationError: string | null;
  readonly result: CartRevalidationResult | null;
  readonly revalidate: () => Promise<CartRevalidationResult | null>;
  readonly acceptPriceChanges: () => void;
  readonly dismissRevalidation: () => void;
}

export function useCartRevalidation(storeId: string | null): UseCartRevalidationResult;
```

---

## 3. Redux Reducer Extensions (`cartSlice.ts`)

```typescript
// New actions on cartSlice:
export const {
  /**
   * Updates base prices and addon prices of existing cart items to reflect
   * accepted price changes from revalidation.
   */
  updateCartItemPrices, // PayloadAction<{ updatedItems: CartItem[] }>
  
  /**
   * Removes specific unavailable items identified during revalidation.
   */
  removeUnavailableItems, // PayloadAction<string[]> (cartItemIds)
} = cartSlice.actions;
```

---

## 4. UI Presentation & Blocking Flow

```text
Enter /checkout
      │
      ▼
Trigger revalidate()
      │
      ├───────────────────────┬────────────────────────┬──────────────────────┐
      │                       │                        │                      │
[ Store Closed ]      [ Unavailable Items ]     [ Prices Changed ]     [ Valid / No Change ]
      │                       │                        │                      │
Show Alert / Banner    Disable Confirm Button   Show Price Change Sheet        Normal checkout
Block Checkout         Provide "Remove" Action  Block Confirm Button           Confirm enabled
                       Wait for user removal    Wait for "Accept" tap
```

### Price Change Sheet Actions
- **"الموافقة والمتابعة" (Accept & Proceed)**:
  - Dispatches `updateCartItemPrices({ updatedItems: result.updatedItems })`.
  - Closes the sheet.
  - Enables the confirm button with recalculated totals.
- **"العودة للسلة" (Return to Cart)**:
  - Dispatches nothing.
  - Closes the sheet.
  - Navigates back to `/cart` or dismisses checkout.
