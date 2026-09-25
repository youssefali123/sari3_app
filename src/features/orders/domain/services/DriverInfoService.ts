import { OrderDriverInfo } from '../entities/OrderDriverInfo';

/**
 * Abstraction for retrieving scoped driver contact details.
 */
export interface DriverInfoService {
  /**
   * Retrieve the scoped driver contact details for an active order.
   * Returns null if the order is not in active fulfillment
   * (accepted, preparing, out_for_delivery) or no driver is assigned.
   */
  getOrderDriverInfo(orderId: string): Promise<OrderDriverInfo | null>;
}
