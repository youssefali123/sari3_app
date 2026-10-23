import { AppError } from '@/shared/types/errors';

/**
 * Domain-level error kinds for driver fulfillment and pool operations.
 * Free of Supabase and React Native dependencies (Principle II).
 */
export type DriverErrorKind =
  | 'driver_already_has_active_order'
  | 'user_not_a_driver'
  | 'driver_id_mismatch'
  | 'order_not_found_or_not_assigned'
  | 'invalid_status_transition'
  | 'pool_unauthorized'
  | 'history_unauthorized'
  | 'claim_conflict' // another driver already claimed the order
  | 'network_error'
  | 'unexpected';

export type DriverError = AppError<DriverErrorKind>;

export class DriverException extends Error implements DriverError {
  readonly kind: DriverErrorKind;
  readonly originalError?: unknown;

  constructor(kind: DriverErrorKind, message?: string, originalError?: unknown) {
    super(message || kind);
    this.name = 'DriverException';
    this.kind = kind;
    this.originalError = originalError;
    Object.setPrototypeOf(this, DriverException.prototype);
  }
}
