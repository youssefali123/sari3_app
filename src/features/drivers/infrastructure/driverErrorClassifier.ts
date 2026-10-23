import {
  getErrorMessageString,
  getPostgresErrorCode,
  isNetworkError,
  logErrorInDev,
} from '@/shared/lib/errorClassifier';
import { DriverErrorKind, DriverException } from '../domain/entities/DriverError';

/**
 * Classifies an unknown error into a typed DriverException (FR-001).
 * Executes exclusively at the infrastructure boundary.
 */
export function classifyDriverError(error: unknown): DriverException {
  if (error instanceof DriverException) {
    return error;
  }

  logErrorInDev('DriverErrorClassifier', error);

  if (isNetworkError(error)) {
    return new DriverException('network_error', 'Network failure', error);
  }

  const code = getPostgresErrorCode(error);
  const msg = getErrorMessageString(error).toUpperCase();

  let kind: DriverErrorKind = 'unexpected';

  if (
    msg.includes('DRIVER ALREADY HAS AN ACTIVE ORDER') ||
    msg.includes('DRIVER_ACTIVE_ORDER_UNIQUE') ||
    code === '23505'
  ) {
    kind = 'driver_already_has_active_order';
  } else if (msg.includes('USER IS NOT A DRIVER')) {
    kind = 'user_not_a_driver';
  } else if (msg.includes('DRIVER ID MISMATCH')) {
    kind = 'driver_id_mismatch';
  } else if (
    msg.includes('ORDER_NOT_FOUND_OR_NOT_ASSIGNED') ||
    code === 'P0002' ||
    code === 'PGRST116'
  ) {
    kind = 'order_not_found_or_not_assigned';
  } else if (
    msg.includes('INVALID_STATUS_TRANSITION') ||
    msg.includes('ORDER_STATUS_CHANGED') ||
    msg.includes('ORDER_STATE_CHANGED')
  ) {
    kind = 'invalid_status_transition';
  } else if (msg.includes('ALREADY_CLAIMED') || msg.includes('CLAIM_CONFLICT')) {
    kind = 'claim_conflict';
  } else if (msg.includes('ONLY_DRIVERS_CAN_VIEW_ORDER_POOL')) {
    kind = 'pool_unauthorized';
  } else if (msg.includes('ONLY_DRIVERS_CAN_VIEW_HISTORY')) {
    kind = 'history_unauthorized';
  } else if (code === '42501') {
    kind = 'pool_unauthorized';
  }

  return new DriverException(kind, msg, error);
}
