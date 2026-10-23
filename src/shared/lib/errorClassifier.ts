/**
 * Shared Error Classifier Utilities.
 *
 * Helpers to extract PostgreSQL error codes, technical messages, and network
 * disconnect signatures from caught errors at the infrastructure boundary.
 */

interface ErrorWithPotentialFields {
  message?: string;
  code?: string | number;
  errcode?: string | number;
  details?: string;
  hint?: string;
}

/**
 * Safely extracts a string representation of the error message for classifier inspection.
 */
export function getErrorMessageString(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || '';
  if (typeof error === 'object') {
    const candidate = error as ErrorWithPotentialFields;
    return candidate.message || candidate.details || '';
  }
  return String(error);
}

/**
 * Inspects an unknown error for PostgreSQL error codes (e.g., '23505', '42501', 'P0002').
 */
export function getPostgresErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as ErrorWithPotentialFields & {
    error?: ErrorWithPotentialFields;
    cause?: ErrorWithPotentialFields;
  };

  if (candidate.code) {
    return String(candidate.code);
  }
  if (candidate.errcode) {
    return String(candidate.errcode);
  }
  if (candidate.error?.code) {
    return String(candidate.error.code);
  }
  if (candidate.cause?.code) {
    return String(candidate.cause.code);
  }

  // Check if error message contains SQLSTATE or errcode pattern
  const msg = getErrorMessageString(error);
  const sqlStateMatch = msg.match(/(?:SQLSTATE|errcode|code)\s*(?:=|:|\s)\s*['"]?([A-Za-z0-9]+)['"]?/i);
  if (sqlStateMatch) {
    return sqlStateMatch[1];
  }

  return null;
}

/**
 * Determines whether an error was caused by offline state, network timeout, or socket drop.
 */
export function isNetworkError(error: unknown): boolean {
  const msg = getErrorMessageString(error).toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('aborterror') ||
    msg.includes('connection refused') ||
    msg.includes('internet connection') ||
    msg.includes('timeout') ||
    msg.includes('offline')
  );
}

/**
 * Debug utility to log technical error details in development mode only.
 */
export function logErrorInDev(prefix: string, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error(`[${prefix}]`, error);
  }
}
