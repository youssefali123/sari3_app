# Cart & Application Contracts: Catalog and Checkout Foundation

**Feature**: Catalog and Checkout Foundation  
**Branch**: `001-catalog-checkout-foundation`  
**Date**: 2026-09-16  
**Status**: Completed

In accordance with Constitution Principle IV (State Ownership Is Never Duplicated), the Cart is client-local state owned strictly by **Redux Toolkit**. Business rules like single-store cart enforcement (BR-002, BR-010) and composite item identity (BR-003) are enforced in the **Application** layer.

---

## 1. Composite Cart Item Identity Utility

```typescript
/**
 * Generates an order-independent deterministic cart item key.
 * [A, B] and [B, A] produce identical composite keys.
 */
export function generateCartItemId(productId: string, addonIds: string[]): string {
  const sorted = [...addonIds].sort();
  return `${productId}::${sorted.join(',')}`;
}
```

---

## 2. Redux Slice State Shape

```typescript
export interface CartAddOnSelection {
  addonId: string;
  name: string;
  unitPrice: number; // in piasters
}

export interface CartItem {
  id: string; // generated via generateCartItemId
  productId: string;
  productName: string;
  productImageUrl: string | null;
  baseUnitPrice: number;
  addonIds: string[]; // Standardized add-on identifier array
  selectedAddOns: CartAddOnSelection[];
  quantity: number;
}

export interface CartState {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  // Conflict modal transient state
  conflictState: {
    isOpen: boolean;
    pendingItem: {
      item: CartItem;
      storeId: string;
      storeName: string;
    } | null;
  };
}
```

---

## 3. Redux Reducers & Actions

### `addItem`
Appends a new cart item or increments quantity if an identical composite key exists:
```typescript
addItem(state, action: PayloadAction<{ item: CartItem; storeId: string; storeName: string }>)
```
*Note: This internal reducer assumes store check has already succeeded.*

### `removeItem`
Removes an item by composite ID:
```typescript
removeItem(state, action: PayloadAction<string>)
```

### `updateQuantity`
Updates the quantity for a composite ID. Removes the item if `quantity <= 0`:
```typescript
updateQuantity(state, action: PayloadAction<{ cartItemId: string; quantity: number }>)
```

### `clearCart`
Resets items and sets `storeId := null`, `storeName := null`:
```typescript
clearCart(state)
```

### `clearAndAddItem`
Atomically clears previous store contents and adds the new item from the incoming store:
```typescript
clearAndAddItem(state, action: PayloadAction<{ item: CartItem; storeId: string; storeName: string }>)
```

### `setConflictPrompt` / `dismissConflict`
Controls the conflict prompt modal state:
```typescript
setConflictPrompt(state, action: PayloadAction<{ item: CartItem; storeId: string; storeName: string }>)
dismissConflict(state)
```

---

## 4. Application Layer: Single-Store Conflict Resolution Hook / Workflow

In compliance with BR-002, BR-010, and SC-003, silent cart clearing is forbidden. The application layer handles conflict detection:

```typescript
export function useAddToCart() {
  const dispatch = useAppDispatch();
  const currentStoreId = useAppSelector(selectCartStoreId);

  const addItemWithConflictCheck = (params: {
    item: CartItem;
    storeId: string;
    storeName: string;
  }) => {
    // 1. If cart is empty or belongs to same store, add immediately
    if (!currentStoreId || currentStoreId === params.storeId) {
      dispatch(cartSlice.actions.addItem(params));
      return;
    }

    // 2. Different store detected: trigger confirmation prompt
    dispatch(cartSlice.actions.setConflictPrompt(params));
  };

  const confirmConflictResolution = () => {
    const pending = selectPendingConflict(store.getState());
    if (pending) {
      dispatch(cartSlice.actions.clearAndAddItem(pending));
    }
  };

  const declineConflictResolution = () => {
    dispatch(cartSlice.actions.dismissConflict());
  };

  return {
    addItemWithConflictCheck,
    confirmConflictResolution,
    declineConflictResolution,
  };
}
```

---

## 5. Selectors

```typescript
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartStoreId = (state: RootState) => state.cart.storeId;
export const selectCartStoreName = (state: RootState) => state.cart.storeName;

export const selectCartItemCount = (state: RootState) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);

export const selectCartSubtotal = (state: RootState) =>
  state.cart.items.reduce((total, item) => {
    const addonsTotal = item.selectedAddOns.reduce((acc, a) => acc + a.unitPrice, 0);
    const itemUnitPrice = item.baseUnitPrice + addonsTotal;
    return total + itemUnitPrice * item.quantity;
  }, 0);

export const selectCartConflict = (state: RootState) => state.cart.conflictState;
```
