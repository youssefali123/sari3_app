import { AvailableOrderPreview } from '../entities/AvailableOrderPreview';
import { DeliveryHistoryEntry } from '../entities/DeliveryHistoryEntry';
import { Order } from '../../../orders/domain/entities/Order';

export interface ClaimOrderResult {
  claimed: boolean;
  order: Order | null;
}

export interface DriverFulfillmentRepository {
  /**
   * Toggle driver availability between Available (true) and Offline (false).
   * Persisted directly to driver_profiles.is_available.
   */
  toggleAvailability(isAvailable: boolean): Promise<boolean>;

  /**
   * Fetch the current driver availability status from driver_profiles.
   */
  getAvailability(): Promise<boolean>;

  /**
   * Retrieve the list of unclaimed pending orders visible to an Available
   * driver. Customer address and phone are omitted. Returns [] if offline.
   */
  getAvailableOrders(): Promise<AvailableOrderPreview[]>;

  /**
   * Atomically claim an available order via the hardened claim_order RPC.
   * Returns { claimed: true, order } on success, or
   * { claimed: false, order: null } when another driver won the race.
   * Note: claim_order's p_driver_id = auth.uid() is injected infrastructure-side
   * (SupabaseDriverFulfillmentRepository); the domain contract takes orderId only.
   */
  claimOrder(orderId: string): Promise<ClaimOrderResult>;

  /**
   * Decline an available order. Driver-scoped; does not affect visibility
   * to other drivers.
   */
  declineOrder(orderId: string): Promise<void>;

  /**
   * Advance the driver's active order to the next sequential lifecycle state:
   * accepted -> preparing -> out_for_delivery -> delivered.
   */
  advanceOrderStatus(orderId: string): Promise<string>;

  /**
   * Self-report inability to complete the active order with a mandatory
   * reason. Reverts the order to the pending pool with driverId = null and
   * clears the driver's active-order pointer.
   */
  releaseOrder(orderId: string, reason: string): Promise<void>;

  /**
   * Retrieve the driver's current active order with full delivery details
   * via a direct RLS query, or null when no active order exists.
   */
  getActiveOrder(): Promise<Order | null>;

  /**
   * Retrieve the driver's delivery history (completed, declined, released,
   * cancelled) newest-first via the get_driver_history SECURITY DEFINER RPC.
   */
  getDeliveryHistory(): Promise<DeliveryHistoryEntry[]>;
}
