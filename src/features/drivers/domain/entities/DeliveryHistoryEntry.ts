/**
 * One entry in the driver's fulfillment history, assembled by the
 * get_driver_history SECURITY DEFINER RPC (released orders have
 * driver_id = NULL and are invisible to standard orders RLS).
 * Entries arrive newest-first.
 */
export type HistoryStatus = 'completed' | 'declined' | 'released' | 'cancelled';

export interface DeliveryHistoryEntry {
  id: string;
  orderId: string;
  storeName: string;
  orderDate: string;
  finalStatus: HistoryStatus;
  /** Displayed only for 'released' entries. */
  releaseReason: string | null;
}
