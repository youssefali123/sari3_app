import { AppError } from '@/shared/types/errors';

/**
 * Domain-level error kinds for order operations (placement, cancellation, retrieval).
 * Free of Supabase and React Native dependencies (Principle II).
 */
export type OrderErrorKind =
  // Pre-condition / Place order errors
  | 'auth_required'
  | 'only_customers_can_place_orders'
  | 'missing_idempotency_key'
  | 'store_not_found'
  | 'store_closed'
  | 'address_not_found'
  | 'product_unavailable'
  | 'product_variant_required'
  | 'addon_unavailable'
  | 'coupon_invalid'
  | 'coupon_expired'
  | 'coupon_store_restricted'
  | 'coupon_min_order_not_met'
  | 'coupon_usage_limit_reached'
  | 'duplicate_idempotency'
  // Cancellation & Transition errors
  | 'order_not_found'
  | 'order_cannot_be_cancelled'
  | 'order_state_changed'
  | 'unauthorized'
  // Network / Generic
  | 'network_error'
  | 'unexpected';

export type OrderError = AppError<OrderErrorKind>;

export class OrderException extends Error implements OrderError {
  readonly kind: OrderErrorKind;
  readonly originalError?: unknown;

  constructor(kind: OrderErrorKind, message?: string, originalError?: unknown) {
    super(message || kind);
    this.name = 'OrderException';
    this.kind = kind;
    this.originalError = originalError;
    Object.setPrototypeOf(this, OrderException.prototype);
  }
}
