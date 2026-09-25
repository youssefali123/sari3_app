import { OrderStatus } from './OrderStatus';
import { MoneyAmount } from '@/shared/types/common';

/**
 * Payment method for the order. Cash on delivery only in the foundation phase.
 */
export type PaymentMethod = 'cash_on_delivery';

/**
 * Immutable point-in-time snapshot of a selected add-on (Principle VII).
 */
export interface AddOnSnapshot {
  addonId: string;
  name: string;
  price: MoneyAmount;
}

/**
 * Immutable point-in-time snapshot of an ordered product line.
 */
export interface OrderItemSnapshot {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: MoneyAmount;
  quantity: number;
  subtotal: MoneyAmount;
  addonSnapshots: AddOnSnapshot[];
}

/**
 * Server-authoritative persisted order with immutable historical snapshots
 * of product names, unit prices, add-ons, and the delivery address.
 */
export interface Order {
  id: string;
  customerId: string;
  driverId: string | null;
  storeId: string;
  storeName: string; // Snapshot
  status: OrderStatus;
  deliveryAddressSnapshot: string; // Snapshot text
  deliveryAddressLabel: string | null;
  paymentMethod: PaymentMethod;
  couponCode: string | null;
  discountAmount: MoneyAmount;
  subtotalAmount: MoneyAmount;
  deliveryFee: MoneyAmount; // 0 in the foundation phase
  totalAmount: MoneyAmount; // subtotalAmount - discountAmount + deliveryFee
  items: OrderItemSnapshot[];
  createdAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
}
