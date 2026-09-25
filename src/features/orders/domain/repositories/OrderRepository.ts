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
}
