import { Unsubscribe } from '../../../../shared/types/common';

export interface DriverRealtimeService {
  /**
   * Subscribe to pending orders pool changes (new order placed, order
   * claimed, order released). Triggers the callback when the available
   * orders list should be refreshed.
   */
  subscribeToAvailableOrders(onOrdersChanged: () => void): Unsubscribe;

  /**
   * Subscribe to status changes on the driver's active order
   * (e.g. cancellation by the customer).
   */
  subscribeToActiveOrder(
    orderId: string,
    onStatusChange: (status: string) => void,
  ): Unsubscribe;
}
