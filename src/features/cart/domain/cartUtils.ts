import { CartItem } from './entities/CartItem';
import { MoneyAmount } from '@/shared/types/common';

/**
 * Pure utility functions for cart identity and calculations.
 * No dependencies on any framework or infrastructure.
 */

/**
 * Generates an order-independent deterministic cart item key.
 * [A, B] and [B, A] produce identical composite keys (BR-003).
 */
export function generateCartItemId(productId: string, addonIds: string[]): string {
  const sorted = [...addonIds].sort();
  return `${productId}::${sorted.join(',')}`;
}

/**
 * Unit price of a cart item: base price plus all selected add-on prices.
 */
export function calculateItemUnitPrice(item: CartItem): MoneyAmount {
  const addonsTotal = item.selectedAddOns.reduce(
    (acc, addon) => acc + addon.unitPrice,
    0,
  );
  return item.baseUnitPrice + addonsTotal;
}

/**
 * Line total for a cart item (unit price × quantity).
 */
export function calculateItemTotal(item: CartItem): MoneyAmount {
  return calculateItemUnitPrice(item) * item.quantity;
}

/**
 * Cart subtotal across all line items (server recomputes authoritatively).
 */
export function calculateCartSubtotal(items: CartItem[]): MoneyAmount {
  return items.reduce((total, item) => total + calculateItemTotal(item), 0);
}

/**
 * Total item count across line items.
 */
export function getCartItemCount(items: CartItem[]): number {
  return items.reduce((count, item) => count + item.quantity, 0);
}
