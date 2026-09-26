import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CartItem } from '../domain/entities/CartItem';
import { generateCartItemId } from '../domain/cartUtils';

interface AddItemPayload {
  item: CartItem;
  storeId: string;
  storeName: string;
}

interface BatchPayload {
  storeId: string;
  storeName: string;
  items: CartItem[];
}

interface CartState {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  // Conflict modal transient state (BR-002, BR-010): no silent cart replacement.
  conflictState: {
    isOpen: boolean;
    pendingItem: AddItemPayload | null;
    // Order Again batch reorder (feature 005): pending multi-item replacement.
    pendingBatch: BatchPayload | null;
  };
}

const initialState: CartState = {
  storeId: null,
  storeName: null,
  items: [],
  conflictState: {
    isOpen: false,
    pendingItem: null,
    pendingBatch: null,
  },
};

function insertOrMergeItem(state: CartState, item: CartItem) {
  const existingIndex = state.items.findIndex((i) => i.id === item.id);
  if (existingIndex >= 0) {
    state.items[existingIndex].quantity += item.quantity;
  } else {
    state.items.push(item);
  }
}

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /**
     * Appends a new cart item or increments quantity if an identical composite
     * key exists. Assumes the single-store check has already succeeded.
     */
    addItem(state, action: PayloadAction<AddItemPayload>) {
      const { item, storeId, storeName } = action.payload;
      state.storeId = storeId;
      state.storeName = storeName;
      insertOrMergeItem(state, item);
    },

    /** Removes an item by composite ID. */
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.id !== action.payload);
      if (state.items.length === 0) {
        state.storeId = null;
        state.storeName = null;
      }
    },

    /**
     * Updates quantity for a composite ID; removes the item when quantity <= 0.
     */
    updateQuantity(
      state,
      action: PayloadAction<{ cartItemId: string; quantity: number }>,
    ) {
      const { cartItemId, quantity } = action.payload;
      const item = state.items.find((i) => i.id === cartItemId);
      if (!item) return;
      if (quantity <= 0) {
        state.items = state.items.filter((i) => i.id !== cartItemId);
        if (state.items.length === 0) {
          state.storeId = null;
          state.storeName = null;
        }
      } else {
        item.quantity = quantity;
      }
    },

    /** Resets items and store ownership. */
    clearCart(state) {
      state.items = [];
      state.storeId = null;
      state.storeName = null;
      state.conflictState = initialState.conflictState;
    },

    /**
     * Atomically clears previous store contents and adds the new item from
     * the incoming store (conflict confirm path).
     */
    clearAndAddItem(state, action: PayloadAction<AddItemPayload>) {
      const { item, storeId, storeName } = action.payload;
      state.items = [item];
      state.storeId = storeId;
      state.storeName = storeName;
      state.conflictState = initialState.conflictState;
    },

    /** Opens the conflict prompt for an item from a different store. */
    setConflictPrompt(state, action: PayloadAction<AddItemPayload>) {
      state.conflictState = {
        isOpen: true,
        pendingItem: action.payload,
        pendingBatch: null,
      };
    },

    /** Closes the conflict prompt without changing cart contents. */
    dismissConflict(state) {
      state.conflictState = initialState.conflictState;
    },

    /**
     * Order Again (feature 005): atomically clears the cart and stages a
     * batch of revalidated items from a past order. Assumes the single-store
     * conflict check has already been resolved by the caller.
     */
    clearAndSetBatch(state, action: PayloadAction<BatchPayload>) {
      const { storeId, storeName, items } = action.payload;
      state.storeId = storeId;
      state.storeName = storeName;
      state.items = items;
      state.conflictState = initialState.conflictState;
    },

    /** Opens the conflict prompt for an Order Again batch from another store. */
    setConflictBatchPrompt(state, action: PayloadAction<BatchPayload>) {
      state.conflictState = {
        isOpen: true,
        pendingItem: null,
        pendingBatch: action.payload,
      };
    },

    /** Conflict confirm path for a pending Order Again batch. */
    confirmBatchReplace(state) {
      const batch = state.conflictState.pendingBatch;
      if (batch) {
        state.storeId = batch.storeId;
        state.storeName = batch.storeName;
        state.items = batch.items;
      }
      state.conflictState = initialState.conflictState;
    },
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  clearCart,
  clearAndAddItem,
  setConflictPrompt,
  dismissConflict,
  clearAndSetBatch,
  setConflictBatchPrompt,
  confirmBatchReplace,
} = cartSlice.actions;

// Selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartStoreId = (state: { cart: CartState }) => state.cart.storeId;
export const selectCartStoreName = (state: { cart: CartState }) =>
  state.cart.storeName;

export const selectCartItemCount = (state: { cart: CartState }) =>
  state.cart.items.reduce((count, item) => count + item.quantity, 0);

export const selectCartSubtotal = (state: { cart: CartState }) =>
  state.cart.items.reduce((total, item) => {
    const addonsTotal = item.selectedAddOns.reduce((acc, a) => acc + a.unitPrice, 0);
    return total + (item.baseUnitPrice + addonsTotal) * item.quantity;
  }, 0);

export const selectCartConflict = (state: { cart: CartState }) =>
  state.cart.conflictState;

/** Re-exported for building composite cart item identities. */
export { generateCartItemId };
