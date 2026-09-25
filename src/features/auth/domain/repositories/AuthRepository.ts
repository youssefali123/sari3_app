import { AuthUser, UserRole } from '../entities/AuthUser';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

/** State returned by register when the account was created but must be confirmed by email before signing in. */
export interface AuthConfirmationPending {
  confirmationRequired: true;
}

export type AuthErrorType =
  | { kind: 'invalid_credentials' }
  | { kind: 'email_already_registered' }
  | { kind: 'weak_password'; message: string }
  | { kind: 'email_not_confirmed' }
  | { kind: 'invalid_confirmation_code' }
  | { kind: 'network_error' }
  | { kind: 'unknown'; message: string };

export type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; error: AuthErrorType };

/**
 * Abstraction for authentication operations.
 * Infrastructure implements this using Supabase Auth.
 */
export interface AuthRepository {
  register(input: RegisterInput): Promise<AuthResult<AuthUser | AuthConfirmationPending>>;
  /** Confirms a signup via the 6-digit code emailed to the user (email OTP). */
  confirmSignUp(email: string, code: string): Promise<AuthResult<AuthUser>>;
  /** Re-sends the signup confirmation code. */
  resendConfirmationCode(email: string): Promise<AuthResult<void>>;
  login(input: { email: string; password: string }): Promise<AuthResult<AuthUser>>;
  logout(): Promise<AuthResult<void>>;
  getSession(): Promise<{ user: AuthUser | null }>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}

export type { AuthUser, UserRole };
