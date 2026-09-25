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
}

/**
 * Valid status transitions. Used for client-side validation.
 * Must match the validate_order_transition trigger exactly:
 * 'cancelled' is reachable only from 'pending' (customer cancel);
 * an accepted order can only advance forward to 'delivered'.
 */
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Accepted, OrderStatus.Cancelled, OrderStatus.Rejected],
  [OrderStatus.Accepted]: [OrderStatus.Preparing],
  [OrderStatus.Preparing]: [OrderStatus.OutForDelivery],
  [OrderStatus.OutForDelivery]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Rejected]: [],
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
