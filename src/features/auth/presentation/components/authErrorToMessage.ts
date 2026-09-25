import { AuthErrorType } from '../../domain/repositories/AuthRepository';

/**
 * Maps domain auth error kinds to user-facing inline messages
 * (Quickstart Scenario 7 — every predictable failure gets a specific message).
 */
export function authErrorToMessage(error: AuthErrorType): string {
  switch (error.kind) {
    case 'invalid_credentials':
      return 'Incorrect email or password.';
    case 'email_already_registered':
      return 'This email is already registered. Try logging in instead.';
    case 'weak_password':
      return 'Password must be at least 6 characters.';
    case 'email_not_confirmed':
      return 'Please confirm your email first — check your inbox for the confirmation email.';
    case 'invalid_confirmation_code':
      return 'That code is incorrect or has expired. Please try again.';
    case 'network_error':
      return 'No internet connection. Please check your network and try again.';
    case 'unknown':
      return 'Something went wrong. Please try again.';
  }
}
