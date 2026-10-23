import {
  getErrorMessageString,
  getPostgresErrorCode,
  isNetworkError,
  logErrorInDev,
} from '@/shared/lib/errorClassifier';
import { AddressErrorKind, AddressException } from '../domain/entities/AddressError';

/**
 * Classifies an unknown error into a typed AddressException (FR-001).
 * Executes exclusively at the infrastructure boundary.
 */
export function classifyAddressError(error: unknown): AddressException {
  if (error instanceof AddressException) {
    return error;
  }

  logErrorInDev('AddressErrorClassifier', error);

  if (isNetworkError(error)) {
    return new AddressException('network_error', 'Network failure', error);
  }

  const code = getPostgresErrorCode(error);
  const msg = getErrorMessageString(error).toUpperCase();

  let kind: AddressErrorKind = 'unexpected';

  if (code === '42501' || msg.includes('UNAUTHORIZED') || msg.includes('NOT_AUTHENTICATED')) {
    kind = 'unauthorized';
  } else if (code === 'P0002' || code === 'PGRST116' || msg.includes('NOT FOUND')) {
    kind = 'address_not_found';
  } else if (msg.includes('VALIDATION') || msg.includes('REQUIRED')) {
    kind = 'validation_failed';
  }

  return new AddressException(kind, msg, error);
}
