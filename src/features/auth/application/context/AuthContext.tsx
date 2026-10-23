import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
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
  /** Permanently deletes the account and all associated user data. */
  deleteAccount: () => Promise<void>;
  /** Re-fetches the profile after a profile_not_found error (Retry path). Returns the fresh profile, if any. */
  refreshProfile: () => Promise<UserProfile | null>;
  /** Triggers the session expired dialog and resets user state (FR-008). */
  notifySessionExpired: () => void;
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
  const isExplicitSignOutRef = useRef(false);
  const isAlertingSessionExpiredRef = useRef(false);
  const userRef = useRef<AuthUser | null>(null);

  const handleSessionExpired = useCallback(() => {
    if (isAlertingSessionExpiredRef.current) return;
    isAlertingSessionExpiredRef.current = true;

    // Purge ALL customer-scoped server state before transitioning to guest
    queryClient.clear();
    setUser(null);
    setProfile(null);
    setAuthError(null);
    userRef.current = null;

    const onContinueAsGuest = () => {
      isAlertingSessionExpiredRef.current = false;
      try {
        router.replace('/(customer)/(home)');
      } catch {
        // Safe fallback if navigation is unavailable
      }
    };

    const onNavigateToLogin = () => {
      isAlertingSessionExpiredRef.current = false;
      try {
        router.replace('/(auth)/login');
      } catch {
        // Safe fallback if navigation is unavailable
      }
    };

    Alert.alert(
      'انتهت الجلسة',
      'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.',
      [
        {
          text: 'متابعة كزائر',
          style: 'cancel',
          onPress: onContinueAsGuest,
        },
        {
          text: 'تسجيل الدخول',
          style: 'default',
          onPress: onNavigateToLogin,
        },
      ],
      {
        cancelable: true,
        onDismiss: onContinueAsGuest,
      },
    );
  }, [queryClient]);

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
      const hadUser = Boolean(userRef.current);
      userRef.current = nextUser;

      if (nextUser) {
        setUser(nextUser);
        void loadProfile(nextUser.id);
      } else {
        setUser(null);
        setProfile(null);
        setAuthError(null);

        // If a previously authenticated session was revoked/expired unexpectedly
        if (hadUser && !isExplicitSignOutRef.current) {
          handleSessionExpired();
        }
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
  }, [loadProfile, handleSessionExpired]);

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
    isExplicitSignOutRef.current = true;
    try {
      // Deactivate this device's push token first, while the session is still
      // valid (RLS needs auth.uid()). Offline: the service queues the server
      // update for the next network contact and clears local state now.
      try {
        await notificationService.deactivateDevice();
      } catch {
        // queued server-side; sign-out proceeds regardless (FR-005 edge case)
      }

      // Immediately cancel any in-flight queries and purge all server state
      await queryClient.cancelQueries();
      queryClient.clear();

      try {
        await authRepository.logout();
      } catch {
        // Tolerates already invalid/expired session state without throwing (FR-008, T052)
      }

      setUser(null);
      setProfile(null);
      setAuthError(null);
      userRef.current = null;
    } finally {
      setTimeout(() => {
        isExplicitSignOutRef.current = false;
      }, 500);
    }
  }, [queryClient]);

  const deleteAccount = useCallback(async () => {
    try {
      await notificationService.deactivateDevice();
    } catch {
      // Best-effort push token deactivation
    }

    const result = await authRepository.deleteAccount();
    if (!result.success) {
      if (result.error.kind === 'active_orders_exist') {
        throw new Error(result.error.message);
      }
      throw new Error(
        result.error.kind === 'unknown'
          ? result.error.message
          : 'فشل حذف الحساب. يرجى المحاولة لاحقاً.'
      );
    }

    try {
      await authRepository.logout();
    } catch {
      // Session already destroyed server-side
    }

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
      deleteAccount,
      refreshProfile,
      notifySessionExpired: handleSessionExpired,
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
      deleteAccount,
      refreshProfile,
      handleSessionExpired,
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
