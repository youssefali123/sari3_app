import { MoneyAmount } from '@/shared/types/common';

/**
 * Difference in unit price between the cached cart item and live catalog.
 */
export interface CartPriceDifference {
  productId: string;
  productName: string;
  oldPrice: MoneyAmount;
  newPrice: MoneyAmount;
}

/**
 * An item in the cart that can no longer be ordered (out of stock or discontinued).
 */
export interface CartUnavailableItem {
  productId: string;
  productName: string;
  reason: 'out_of_stock' | 'discontinued';
}

/**
 * Consolidated outcome of revalidating cart items and store state against live catalog.
 */
export interface CartRevalidationResult {
  /** True when all items are available and there are no unresolved price differences or closed store. */
  isValid: boolean;
  /** Whether the store is currently closed. */
  isStoreClosed: boolean;
  /** Optional store name for context messages. */
  storeName?: string;
  /** Items whose price changed in the catalog since they were added to cart. */
  priceDifferences: CartPriceDifference[];
  /** Items that are currently inactive or out of stock. */
  unavailableItems: CartUnavailableItem[];
}
