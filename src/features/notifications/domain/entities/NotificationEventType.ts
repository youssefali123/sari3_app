/**
 * Enum of notification event types matching the server-side CHECK
 * constraint on `notification_events.event_type`.
 */
export enum NotificationEventType {
  NewOrderPool = 'new_order_pool',
  OrderAccepted = 'order_accepted',
  OrderPreparing = 'order_preparing',
  OrderOutForDelivery = 'order_out_for_delivery',
  OrderDelivered = 'order_delivered',
  OrderCancelled = 'order_cancelled',
  OrderReleased = 'order_released',
}
