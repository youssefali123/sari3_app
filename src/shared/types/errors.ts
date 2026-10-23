/**
 * Base Application Error Definitions.
 *
 * Domain and Application layers must remain pure TypeScript without dependencies
 * on React Native, Expo, Supabase, TanStack Query, or Redux (Constitution Principle II).
 */

export interface AppError<TKind extends string = string> {
  readonly kind: TKind;
  /** Optional developer/debug context — NEVER displayed directly to users in presentation */
  readonly message?: string;
  /** Underlying cause/exception preserved for development-mode console logging */
  readonly originalError?: unknown;
}

/**
 * Generic error categories common across multiple business capabilities.
 */
export type SharedErrorKind =
  | 'network_error'
  | 'session_expired'
  | 'permission_denied'
  | 'not_found'
  | 'unexpected';

/**
 * Type-safe localized message dictionary shape.
 */
export type ErrorMessageDictionary<TKind extends string> = Record<TKind, string>;
