import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cartSlice, hydrateCart } from '@/features/cart/application/cartSlice';
import { areaSlice } from '@/features/areas/application/areaSlice';

const CART_STORAGE_KEY = '@sari3_cart_storage_v1';

export const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    area: areaSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Typed hooks for Redux — use these instead of plain useDispatch/useSelector.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

let isHydrated = false;
let previousSerializedCart = '';
let hydrationPromise: Promise<void> | null = null;
let resolveHydration: (() => void) | null = null;

export function getIsCartHydrated(): boolean {
  return isHydrated;
}

/**
 * Returns a promise that resolves when AsyncStorage finishes reading the cart,
 * or when the safety timeout (1,500ms) expires (FR-017, FR-018).
 */
export function waitForCartHydration(timeoutMs = 1500): Promise<void> {
  if (isHydrated) return Promise.resolve();

  if (!hydrationPromise) {
    hydrationPromise = new Promise<void>((resolve) => {
      resolveHydration = resolve;
      // Enforce safety timeout so startup is never blocked indefinitely
      setTimeout(() => {
        isHydrated = true;
        resolve();
      }, timeoutMs);
    });
  }

  return hydrationPromise;
}

/**
 * Hook to observe cart hydration state during startup gating in _layout.tsx
 */
export function useCartHydrated(): boolean {
  const [hydrated, setHydrated] = useState(isHydrated);

  useEffect(() => {
    if (isHydrated) {
      setHydrated(true);
      return;
    }
    let isMounted = true;
    waitForCartHydration().then(() => {
      if (isMounted) setHydrated(true);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return hydrated;
}

/**
 * Initializes the cart from AsyncStorage.
 * Prevents overwriting persisted cart before initial load finishes.
 */
export async function initializeCartPersistence(): Promise<void> {
  if (isHydrated) return;
  try {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items)) {
        store.dispatch(
          hydrateCart({
            storeId: parsed.storeId ?? null,
            storeName: parsed.storeName ?? null,
            items: parsed.items,
            checkoutIntent: parsed.checkoutIntent ?? null,
          }),
        );
        previousSerializedCart = JSON.stringify({
          storeId: parsed.storeId ?? null,
          storeName: parsed.storeName ?? null,
          items: parsed.items,
          checkoutIntent: parsed.checkoutIntent ?? null,
        });
      }
    }
  } catch (error) {
    console.warn('[CartStorage] Failed to load cart from AsyncStorage:', error);
  } finally {
    isHydrated = true;
    if (resolveHydration) {
      resolveHydration();
      resolveHydration = null;
    }
  }
}

// Automatically initiate rehydration as early as possible
void initializeCartPersistence();

// Subscribe to store updates to persist any cart change
store.subscribe(() => {
  if (!isHydrated) {
    return;
  }

  const state = store.getState();
  const currentCartData = {
    storeId: state.cart.storeId,
    storeName: state.cart.storeName,
    items: state.cart.items,
    checkoutIntent: state.cart.checkoutIntent,
  };
  const currentSerialized = JSON.stringify(currentCartData);

  if (currentSerialized !== previousSerializedCart) {
    previousSerializedCart = currentSerialized;
    AsyncStorage.setItem(CART_STORAGE_KEY, currentSerialized).catch((error) => {
      console.warn('[CartStorage] Failed to save cart to AsyncStorage:', error);
    });
  }
});
