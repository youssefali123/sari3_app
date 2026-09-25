import { useCallback } from 'react';
import { CartItem } from '../domain/entities/CartItem';
import {
  addItem,
  clearAndAddItem,
  dismissConflict,
  selectCartConflict,
  selectCartStoreId,
  setConflictPrompt,
} from './cartSlice';
import { store, useAppDispatch, useAppSelector } from '@/shared/lib/store';

interface AddToCartParams {
  item: CartItem;
  storeId: string;
  storeName: string;
}

/**
 * Application-layer single-store conflict resolution (BR-002, BR-010, SC-003).
 * Never silently clears the cart: a different store triggers a confirmation
 * prompt that the customer must accept or decline.
 */
export function useAddToCart() {
  const dispatch = useAppDispatch();
  const currentStoreId = useAppSelector(selectCartStoreId);

  const addItemWithConflictCheck = useCallback(
    (params: AddToCartParams) => {
      // 1. Empty cart or same store: add immediately.
      if (!currentStoreId || currentStoreId === params.storeId) {
        dispatch(addItem(params));
        return;
      }
      // 2. Different store: trigger the confirmation prompt.
      dispatch(setConflictPrompt(params));
    },
    [dispatch, currentStoreId],
  );

  const confirmConflictResolution = useCallback(() => {
    const pending = selectCartConflict(store.getState()).pendingItem;
    if (pending) {
      dispatch(clearAndAddItem(pending));
    }
  }, [dispatch]);

  const declineConflictResolution = useCallback(() => {
    dispatch(dismissConflict());
  }, [dispatch]);

  return {
    addItemWithConflictCheck,
    confirmConflictResolution,
    declineConflictResolution,
  };
}
