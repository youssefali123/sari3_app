import { useCallback, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/store';
import {
  selectCartItems,
  selectCartStoreId,
  selectCartStoreName,
  updateCartItemPrices,
  removeUnavailableItems,
} from '../cartSlice';
import {
  CartPriceDifference,
  CartRevalidationResult,
  CartUnavailableItem,
} from '../../domain/entities/CartRevalidation';
import { ProductRepository } from '@/features/products/domain/repositories/ProductRepository';
import { SupabaseProductRepository } from '@/features/products/infrastructure/SupabaseProductRepository';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';

const productRepository: ProductRepository = new SupabaseProductRepository();
const storeRepository: StoreRepository = new SupabaseStoreRepository();

/**
 * Revalidates cached cart contents against live catalog and store availability (FR-007).
 * Identifies price discrepancies, closed stores, and discontinued/out-of-stock items.
 */
export function useCartRevalidation() {
  const dispatch = useAppDispatch();
  const cartItems = useAppSelector(selectCartItems);
  const cartStoreId = useAppSelector(selectCartStoreId);
  const cartStoreName = useAppSelector(selectCartStoreName);

  const [isRevalidating, setIsRevalidating] = useState(false);
  const [lastResult, setLastResult] = useState<CartRevalidationResult | null>(null);

  const revalidate = useCallback(async (): Promise<CartRevalidationResult> => {
    if (!cartStoreId || cartItems.length === 0) {
      const emptyResult: CartRevalidationResult = {
        isValid: true,
        isStoreClosed: false,
        storeName: cartStoreName ?? undefined,
        priceDifferences: [],
        unavailableItems: [],
      };
      setLastResult(emptyResult);
      return emptyResult;
    }

    setIsRevalidating(true);
    try {
      // 1. Check live store status
      const store = await storeRepository.getStoreById(cartStoreId);
      if (!store.isOpen) {
        const closedResult: CartRevalidationResult = {
          isValid: false,
          isStoreClosed: true,
          storeName: store.name,
          priceDifferences: [],
          unavailableItems: [],
        };
        setLastResult(closedResult);
        return closedResult;
      }

      // 2. Query all live products for this store
      const liveProducts = await productRepository.getProductsByStore(cartStoreId);
      const productById = new Map(liveProducts.map((p) => [p.id, p]));

      const priceDifferences: CartPriceDifference[] = [];
      const unavailableItems: CartUnavailableItem[] = [];
      const seenPriceDiffProducts = new Set<string>();
      const seenUnavailableProducts = new Set<string>();

      for (const item of cartItems) {
        const live = productById.get(item.productId);

        if (!live) {
          if (!seenUnavailableProducts.has(item.productId)) {
            seenUnavailableProducts.add(item.productId);
            unavailableItems.push({
              productId: item.productId,
              productName: item.productName,
              reason: 'discontinued',
            });
          }
          continue;
        }

        if (!live.isAvailable) {
          if (!seenUnavailableProducts.has(item.productId)) {
            seenUnavailableProducts.add(item.productId);
            unavailableItems.push({
              productId: item.productId,
              productName: item.productName,
              reason: 'out_of_stock',
            });
          }
          continue;
        }

        // Compare base unit price
        if (live.price !== item.baseUnitPrice) {
          if (!seenPriceDiffProducts.has(item.productId)) {
            seenPriceDiffProducts.add(item.productId);
            priceDifferences.push({
              productId: item.productId,
              productName: item.productName,
              oldPrice: item.baseUnitPrice,
              newPrice: live.price,
            });
          }
        }
      }

      const outcome: CartRevalidationResult = {
        isValid: unavailableItems.length === 0 && priceDifferences.length === 0,
        isStoreClosed: false,
        storeName: store.name,
        priceDifferences,
        unavailableItems,
      };

      setLastResult(outcome);
      return outcome;
    } finally {
      setIsRevalidating(false);
    }
  }, [cartItems, cartStoreId, cartStoreName]);

  const acceptPriceChanges = useCallback(
    (differences: CartPriceDifference[]) => {
      dispatch(
        updateCartItemPrices(
          differences.map((d) => ({
            productId: d.productId,
            newPrice: d.newPrice,
          })),
        ),
      );
      setLastResult((prev) =>
        prev
          ? {
              ...prev,
              priceDifferences: [],
              isValid: prev.unavailableItems.length === 0,
            }
          : null,
      );
    },
    [dispatch],
  );

  const removeUnavailable = useCallback(
    (items: CartUnavailableItem[]) => {
      dispatch(removeUnavailableItems(items.map((i) => i.productId)));
      setLastResult((prev) =>
        prev
          ? {
              ...prev,
              unavailableItems: [],
              isValid: prev.priceDifferences.length === 0,
            }
          : null,
      );
    },
    [dispatch],
  );

  return {
    revalidate,
    isRevalidating,
    lastResult,
    acceptPriceChanges,
    removeUnavailable,
  };
}
