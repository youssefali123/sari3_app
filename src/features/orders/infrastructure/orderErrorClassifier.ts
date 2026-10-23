import {
  getErrorMessageString,
  getPostgresErrorCode,
  isNetworkError,
  logErrorInDev,
} from '@/shared/lib/errorClassifier';
import { OrderErrorKind, OrderException } from '../domain/entities/OrderError';

/**
 * Classifies an unknown error into a typed OrderException (FR-001).
 * Executes exclusively at the infrastructure boundary.
 */
export function classifyOrderError(error: unknown): OrderException {
  if (error instanceof OrderException) {
    return error;
  }

  logErrorInDev('OrderErrorClassifier', error);

  if (isNetworkError(error)) {
    return new OrderException('network_error', 'Network failure', error);
  }

  const code = getPostgresErrorCode(error);
  const msg = getErrorMessageString(error).toUpperCase();

  let kind: OrderErrorKind = 'unexpected';

  if (msg.includes('AUTH_REQUIRED') || msg.includes('NOT_AUTHENTICATED')) {
    kind = 'auth_required';
  } else if (msg.includes('ONLY_CUSTOMERS_CAN_PLACE_ORDERS')) {
    kind = 'only_customers_can_place_orders';
  } else if (msg.includes('MISSING_IDEMPOTENCY_KEY')) {
    kind = 'missing_idempotency_key';
  } else if (msg.includes('STORE_NOT_FOUND')) {
    kind = 'store_not_found';
  } else if (msg.includes('STORE_CLOSED')) {
    kind = 'store_closed';
  } else if (msg.includes('ADDRESS_NOT_FOUND')) {
    kind = 'address_not_found';
  } else if (msg.includes('PRODUCT_VARIANT_REQUIRED')) {
    kind = 'product_variant_required';
  } else if (msg.includes('PRODUCT_UNAVAILABLE')) {
    kind = 'product_unavailable';
  } else if (msg.includes('ADDON_UNAVAILABLE')) {
    kind = 'addon_unavailable';
  } else if (msg.includes('COUPON_INVALID')) {
    kind = 'coupon_invalid';
  } else if (msg.includes('COUPON_EXPIRED')) {
    kind = 'coupon_expired';
  } else if (msg.includes('COUPON_STORE_RESTRICTED')) {
    kind = 'coupon_store_restricted';
  } else if (msg.includes('COUPON_MIN_ORDER_NOT_MET')) {
    kind = 'coupon_min_order_not_met';
  } else if (msg.includes('COUPON_USAGE_LIMIT_REACHED')) {
    kind = 'coupon_usage_limit_reached';
  } else if (msg.includes('ORDER_CANNOT_BE_CANCELLED')) {
    kind = 'order_cannot_be_cancelled';
  } else if (msg.includes('ORDER_STATE_CHANGED') || msg.includes('ORDER_STATUS_CHANGED')) {
    kind = 'order_state_changed';
  } else if (code === '23505' || msg.includes('DUPLICATE')) {
    kind = 'duplicate_idempotency';
  } else if (msg.includes('ORDER_NOT_FOUND') || code === 'P0002' || code === 'PGRST116') {
    kind = 'order_not_found';
  } else if (msg.includes('UNAUTHORIZED') || code === '42501') {
    kind = 'unauthorized';
  }

  return new OrderException(kind, msg, error);
}
