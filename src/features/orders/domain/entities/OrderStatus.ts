/**
 * Order status enum with valid lifecycle transitions.
 */
export enum OrderStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Preparing = 'preparing',
  OutForDelivery = 'out_for_delivery',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Rejected = 'rejected',
  Expired = 'expired',
}

/**
 * Valid status transitions. Used for client-side validation.
 * Must match the validate_order_transition trigger exactly:
 * - 'cancelled' is reachable from 'pending', 'accepted', 'preparing', and
 *   'out_for_delivery' (customer self-service cancellation via cancel_order);
 * - 'expired' is reachable only from 'pending' (server-side expiration job);
 * - 'rejected' remains reserved (no write path yet).
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Accepted, OrderStatus.Cancelled, OrderStatus.Rejected, OrderStatus.Expired],
  [OrderStatus.Accepted]: [OrderStatus.Preparing, OrderStatus.Cancelled],
  [OrderStatus.Preparing]: [OrderStatus.OutForDelivery, OrderStatus.Cancelled],
  [OrderStatus.OutForDelivery]: [OrderStatus.Delivered, OrderStatus.Cancelled],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Rejected]: [],
  [OrderStatus.Expired]: [],
};

/**
 * Checks whether a status transition is valid.
 */
export function canTransitionTo(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Returns the list of statuses an order can transition to from its current status.
 */
export function getNextStatuses(current: OrderStatus): OrderStatus[] {
  return VALID_TRANSITIONS[current] ?? [];
}

/**
 * Whether the order is in a terminal state (no further transitions possible).
 */
export function isTerminalStatus(status: OrderStatus): boolean {
  return VALID_TRANSITIONS[status]?.length === 0;
}
