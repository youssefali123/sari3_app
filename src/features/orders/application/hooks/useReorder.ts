import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { showAlert } from '@/shared/utils/alert';
import { useAppDispatch, useAppSelector } from '@/shared/lib/store';
import { Order } from '../../domain/entities/Order';
import {
  clearAndSetBatch,
  selectCartItems,
  selectCartStoreId,
  setConflictBatchPrompt,
} from '../../../cart/application/cartSlice';
import { CartItem } from '../../../cart/domain/entities/CartItem';
import { generateCartItemId } from '../../../cart/domain/cartUtils';
import { ProductRepository } from '@/features/products/domain/repositories/ProductRepository';
import { SupabaseProductRepository } from '@/features/products/infrastructure/SupabaseProductRepository';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';

const productRepository: ProductRepository = new SupabaseProductRepository();
const storeRepository: StoreRepository = new SupabaseStoreRepository();

/**
 * "Order Again" (feature 005 US5): rebuilds the cart from a historical
 * order's item snapshots, revalidates every product and add-on against the
 * live catalog (current availability and prices), resolves single-store
 * conflicts via the existing confirmation prompt, and hands off to the
 * standard checkout — never creating an order automatically (FR-027/FR-028).
 */
export function useReorder() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const cartItems = useAppSelector(selectCartItems);
  const cartStoreId = useAppSelector(selectCartStoreId);

  return useCallback(
    async (order: Order) => {
      try {
        // 1. Store must currently be open (spec edge case).
        const store = await storeRepository.getStoreById(order.storeId);
        if (!store.isOpen) {
          showAlert('Store closed', `${store.name} is currently closed and cannot accept new orders.`);
          return;
        }

        // 2. Revalidate every historical snapshot item against the live menu.
        const liveProducts = await productRepository.getProductsByStore(order.storeId);
        const productById = new Map(liveProducts.map((p) => [p.id, p]));

        const items: CartItem[] = [];
        const omitted = new Set<string>();

        for (const snapshot of order.items) {
          const product = productById.get(snapshot.productId);
          if (!product || !product.isAvailable) {
            omitted.add(snapshot.productName);
            continue;
          }

          // Revalidate add-ons against the product's current live add-ons.
          const liveAddOns = await productRepository.getAddOnsByProductId(product.id);
          const addOnById = new Map(liveAddOns.map((a) => [a.id, a]));

          const selectedAddOns = [];
          const addonIds: string[] = [];
          let addOnsOmitted = false;
          for (const snapshotAddOn of snapshot.addonSnapshots) {
            const liveAddOn = addOnById.get(snapshotAddOn.addonId);
            if (!liveAddOn || !liveAddOn.isAvailable) {
              addOnsOmitted = true;
              continue;
            }
            selectedAddOns.push({
              addonId: liveAddOn.id,
              name: liveAddOn.name,
              unitPrice: liveAddOn.price,
            });
            addonIds.push(liveAddOn.id);
          }
          if (addOnsOmitted) {
            omitted.add(`${snapshot.productName} (some add-ons)`);
          }

          items.push({
            id: generateCartItemId(product.id, addonIds),
            productId: product.id,
            productName: product.name,
            productImageUrl: product.imageUrl,
            baseUnitPrice: product.price, // current live price, never the snapshot
            addonIds,
            selectedAddOns,
            quantity: snapshot.quantity,
          });
        }

        if (items.length === 0) {
          showAlert(
            'Nothing available',
            'None of the items from that order are currently available. Browse the store for the current menu.',
          );
          return;
        }

        if (omitted.size > 0) {
          showAlert(
            'Some items were removed',
            `These are no longer available and were not added:\n\n• ${[...omitted].join('\n• ')}`,
          );
        }

        // 3. Single-store conflict resolution (FR-028) — never silent.
        const batch = { storeId: order.storeId, storeName: order.storeName, items };
        if (cartItems.length > 0 && cartStoreId !== order.storeId) {
          dispatch(setConflictBatchPrompt(batch));
          // Checkout navigation happens after the user confirms replacement
          // (the conflict modal's confirm path stages the batch).
          return;
        }

        dispatch(clearAndSetBatch(batch));
        router.push('/(customer)/checkout');
      } catch (error) {
        showAlert(
          'Could not reorder',
          error instanceof Error ? error.message : 'Please try again.',
        );
      }
    },
    [cartItems, cartStoreId, dispatch, router],
  );
}
