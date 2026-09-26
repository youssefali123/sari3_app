import { Order } from '../entities/Order';

export interface PlaceOrderInput {
  storeId: string;
  deliveryAddressId: string;
  paymentMethod: 'cash_on_delivery';
  couponCode?: string | null;
  items: {
    productId: string;
    quantity: number;
    addonIds: string[];
  }[];
}

/**
 * Abstraction for order data access. Order placement is submitted as an
 * intent; the server owns all prices, discounts, and snapshots (Principle V).
 */
export interface OrderRepository {
  /**
   * Submit an order request for atomic server validation and creation.
   */
  placeOrder(input: PlaceOrderInput): Promise<Order>;

  /**
   * Retrieve an order by its unique ID.
   */
  getOrderById(id: string): Promise<Order>;

  /**
   * Retrieve order history for the authenticated customer.
   */
  getCustomerOrders(customerId: string): Promise<Order[]>;

  /**
   * Cancel the customer's own order via the server-authoritative cancel_order
   * RPC. Allowed while pending, accepted, preparing, or out_for_delivery;
   * rejected for terminal statuses. Returns the updated Order.
   */
  cancelOrder(orderId: string): Promise<Order>;

  /**
   * Soft-hide an order from the customer's visible history via the
   * hide_order RPC. The order row and snapshots are never deleted; the
   * order remains accessible by direct ID (deep links, Order Again).
   */
  hideOrder(orderId: string): Promise<void>;
}
