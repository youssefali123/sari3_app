import { AppError } from '@/shared/types/errors';

/**
 * Domain-level error kinds for address management operations.
 * Free of Supabase and React Native dependencies (Principle II).
 */
export type AddressErrorKind =
  | 'address_not_found'
  | 'validation_failed'
  | 'unauthorized'
  | 'network_error'
  | 'unexpected';

export type AddressError = AppError<AddressErrorKind>;

export class AddressException extends Error implements AddressError {
  readonly kind: AddressErrorKind;
  readonly originalError?: unknown;

  constructor(kind: AddressErrorKind, message?: string, originalError?: unknown) {
    super(message || kind);
    this.name = 'AddressException';
    this.kind = kind;
    this.originalError = originalError;
    Object.setPrototypeOf(this, AddressException.prototype);
  }
}
