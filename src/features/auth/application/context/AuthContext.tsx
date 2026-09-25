import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { AuthUser } from '../../domain/entities/AuthUser';
import {
  AuthConfirmationPending,
  AuthResult,
} from '../../domain/repositories/AuthRepository';
import { SupabaseAuthRepository } from '../../infrastructure/SupabaseAuthRepository';
import { UserProfile } from '@/features/profile/domain/entities/UserProfile';
import { ProfileNotFoundError } from '@/features/profile/domain/repositories/ProfileRepository';
import { SupabaseProfileRepository } from '@/features/profile/infrastructure/SupabaseProfileRepository';
import { ExpoNotificationService } from '@/features/notifications/infrastructure/ExpoNotificationService';

export type AuthErrorKind = 'profile_not_found';

interface AuthContextValue {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  /**
   * True while a signed-in user's profile fetch is in flight (or pending).
   * Role-based routing MUST wait for this to settle — profile is null during
   * the fetch, and reading role too early misroutes drivers to customer UI.
   */
  isProfileLoading: boolean;
  authError: AuthErrorKind | null;
  signIn: (email: string, password: string) => Promise<AuthResult<AuthUser>>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<AuthResult<AuthUser | AuthConfirmationPending>>;
  /** Confirms a signup with the 6-digit emailed code; establishes the session on success. */
  confirmSignUp: (email: string, code: string) => Promise<AuthResult<AuthUser>>;
  resendConfirmationCode: (email: string) => Promise<AuthResult<void>>;
  signOut: () => Promise<void>;
  /** Re-fetches the profile after a profile_not_found error (Retry path). Returns the fresh profile, if any. */
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const authRepository = new SupabaseAuthRepository();
const profileRepository = new SupabaseProfileRepository();
const notificationService = new ExpoNotificationService();

interface AuthProviderProps {
  queryClient: QueryClient;
  children: React.ReactNode;
}

/**
 * Owns the client-local auth session state (Constitution Principle IV).
 * Transport-agnostic from the UI's perspective: no router calls in here —
 * screens and layouts decide navigation based on the exposed state.
 */
export function AuthProvider({ queryClient, children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorKind | null>(null);
  const mountedRef = useRef(true);

  const loadProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    setIsProfileLoading(true);
    try {
      const loaded = await profileRepository.getProfile(userId);
      if (!mountedRef.current) return null;
      setProfile(loaded);
      setAuthError(null);
      return loaded;
    } catch (error) {
      if (!mountedRef.current) return null;
      setProfile(null);
      if (error instanceof ProfileNotFoundError) {
        setAuthError('profile_not_found');
      }
      // Network/other errors keep the session but leave profile null;
      // screens read authError/profile to decide what to render.
      return null;
    } finally {
      if (mountedRef.current) setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleUser = (nextUser: AuthUser | null) => {
      setUser(nextUser);
      if (nextUser) {
        void loadProfile(nextUser.id);
      } else {
        setProfile(null);
        setAuthError(null);
      }
    };

    // The first callback from onAuthStateChange is the INITIAL_SESSION event:
    // once it fires, session resolution is done and the splash can hide.
    let initialSessionResolved = false;
    const unsubscribe = authRepository.onAuthStateChange((nextUser) => {
      if (!initialSessionResolved) {
        initialSessionResolved = true;
        setIsLoading(false);
      }
      handleUser(nextUser);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string) => authRepository.login({ email, password }),
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) =>
      authRepository.register({ email, password, fullName }),
    [],
  );

  const confirmSignUp = useCallback(
    async (email: string, code: string) => authRepository.confirmSignUp(email, code),
    [],
  );

  const resendConfirmationCode = useCallback(
    async (email: string) => authRepository.resendConfirmationCode(email),
    [],
  );

  const signOut = useCallback(async () => {
    // Deactivate this device's push token first, while the session is still
    // valid (RLS needs auth.uid()). Offline: the service queues the server
    // update for the next network contact and clears local state now.
    try {
      await notificationService.deactivateDevice();
    } catch {
      // queued server-side; sign-out proceeds regardless (FR-005 edge case)
    }

    const result = await authRepository.logout();
    if (!result.success) {
      throw new Error(result.error.kind === 'unknown' ? result.error.message : 'Sign out failed.');
    }
    // Purge ALL customer-scoped server state before the user switch.
    queryClient.clear();
    setUser(null);
    setProfile(null);
    setAuthError(null);
  }, [queryClient]);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;
    return loadProfile(user.id);
  }, [user, loadProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      isProfileLoading,
      authError,
      signIn,
      signUp,
      confirmSignUp,
      resendConfirmationCode,
      signOut,
      refreshProfile,
    }),
    [
      user,
      profile,
      isLoading,
      isProfileLoading,
      authError,
      signIn,
      signUp,
      confirmSignUp,
      resendConfirmationCode,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export { authRepository };
