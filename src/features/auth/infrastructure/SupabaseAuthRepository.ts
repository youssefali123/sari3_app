import { supabase } from '@/shared/lib/supabase';
import { AuthUser } from '../domain/entities/AuthUser';
import {
  AuthConfirmationPending,
  AuthRepository,
  AuthResult,
  AuthErrorType,
  RegisterInput,
} from '../domain/repositories/AuthRepository';
import type { Database } from '@/shared/types/supabase';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

function mapAuthUser(user: {
  id: string;
  email?: string | null;
} | null): AuthUser | null {
  if (!user) return null;
  return { id: user.id, email: user.email ?? '' };
}

/** Maps Supabase Auth error messages to domain error kinds. */
function mapAuthError(message: string): AuthErrorType {
  if (message.includes('Invalid login credentials')) {
    return { kind: 'invalid_credentials' };
  }
  if (message.includes('User already registered')) {
    return { kind: 'email_already_registered' };
  }
  if (message.includes('Password should be at least 6 characters')) {
    return { kind: 'weak_password', message };
  }
  if (message.includes('Email not confirmed')) {
    return { kind: 'email_not_confirmed' };
  }
  if (message.includes('Token has expired') || message.includes('OTP')) {
    return { kind: 'invalid_confirmation_code' };
  }
  if (
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('NetworkError')
  ) {
    return { kind: 'network_error' };
  }
  return { kind: 'unknown', message };
}

/**
 * Supabase Auth implementation of the AuthRepository contract.
 */
export class SupabaseAuthRepository implements AuthRepository {
  async register(input: RegisterInput): Promise<AuthResult<AuthUser | AuthConfirmationPending>> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.fullName } as Partial<ProfilesRow> & Record<string, unknown>,
        },
      });
      if (error) return { success: false, error: mapAuthError(error.message) };

      // Email confirmation enabled: no session yet, user must confirm first.
      if (!data.session) {
        const pending: AuthConfirmationPending = { confirmationRequired: true };
        return { success: true, data: pending };
      }
      const user = mapAuthUser(data.user);
      if (!user) {
        return { success: false, error: { kind: 'unknown', message: 'Registration failed.' } };
      }
      return { success: true, data: user };
    } catch (error) {
      return {
        success: false,
        error: {
          kind: 'network_error',
          ...(error instanceof Error ? {} : {}),
        },
      };
    }
  }

  /** Confirms a signup via the 6-digit email OTP and establishes the session. */
  async confirmSignUp(email: string, code: string): Promise<AuthResult<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });
      if (error) return { success: false, error: mapAuthError(error.message) };
      const user = mapAuthUser(data.user);
      if (!user) {
        return {
          success: false,
          error: { kind: 'unknown', message: 'Confirmation failed.' },
        };
      }
      return { success: true, data: user };
    } catch {
      return { success: false, error: { kind: 'network_error' } };
    }
  }

  /** Re-sends the signup confirmation code (email OTP). */
  async resendConfirmationCode(email: string): Promise<AuthResult<void>> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) return { success: false, error: mapAuthError(error.message) };
      return { success: true, data: undefined };
    } catch {
      return { success: false, error: { kind: 'network_error' } };
    }
  }

  async login(input: { email: string; password: string }): Promise<AuthResult<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (error) return { success: false, error: mapAuthError(error.message) };
      const user = mapAuthUser(data.user);
      if (!user) {
        return { success: false, error: { kind: 'unknown', message: 'Login failed.' } };
      }
      return { success: true, data: user };
    } catch {
      return { success: false, error: { kind: 'network_error' } };
    }
  }

  async logout(): Promise<AuthResult<void>> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { success: false, error: { kind: 'unknown', message: error.message } };
      return { success: true, data: undefined };
    } catch {
      return { success: false, error: { kind: 'network_error' } };
    }
  }

  async getSession(): Promise<{ user: AuthUser | null }> {
    try {
      const { data } = await supabase.auth.getSession();
      return { user: mapAuthUser(data.session?.user ?? null) };
    } catch {
      return { user: null };
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(mapAuthUser(session?.user ?? null));
    });
    return () => data.subscription.unsubscribe();
  }
}
