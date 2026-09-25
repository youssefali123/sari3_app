import { Order } from '../entities/Order';
import { OrderStatus } from '../entities/OrderStatus';
import { Unsubscribe } from '@/shared/types/common';

/**
 * Abstraction for real-time order event subscriptions.
 * Infrastructure implements this using the appropriate realtime mechanism.
 */
export interface OrderRealtimeService {
  /**
   * Subscribe to status changes for a specific order.
   * Used by customers to track their order in real time.
   */
  subscribeToOrderStatus(
    orderId: string,
    callback: (status: OrderStatus) => void,
  ): Unsubscribe;

  /**
   * Subscribe to changes in the available orders pool.
   * Used by drivers to see new orders as they appear.
   */
  subscribeToAvailableOrders(
    callback: (orders: Order[]) => void,
  ): Unsubscribe;
}
