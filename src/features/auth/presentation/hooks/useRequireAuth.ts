import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../application/hooks/useAuth';

interface UseRequireAuthOptions {
  /** Route to return to after successful authentication. */
  returnTo?: string;
}

/**
 * Presentation-layer guard for protected screens and actions (Constitution
 * Principle II — it orchestrates UI navigation, so it lives beside the
 * components that use it). Once the session resolves without a user, it
 * redirects to the login screen carrying `returnTo` so authentication can
 * bring the customer back to their intended destination.
 */
export function useRequireAuth(returnToOrOptions: string | UseRequireAuthOptions = {}) {
  const options =
    typeof returnToOrOptions === 'string' ? { returnTo: returnToOrOptions } : returnToOrOptions;
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const redirectSentRef = useRef(false);

  useEffect(() => {
    if (isLoading || user || redirectSentRef.current) return;
    redirectSentRef.current = true;
    router.push({
      pathname: '/(auth)/login',
      params: { returnTo: options.returnTo ?? '' },
    });
  }, [isLoading, user, router, options.returnTo]);

  /** Action-level guard: call before a protected action; returns whether it may proceed. */
  const requireAuth = useCallback(
    (returnTo?: string) => {
      if (isLoading) return false;
      if (user) return true;
      router.push({
        pathname: '/(auth)/login',
        params: { returnTo: returnTo ?? options.returnTo ?? '' },
      });
      return false;
    },
    [isLoading, user, router, options.returnTo],
  );

  return { isAuthenticated: Boolean(user), isLoading, requireAuth };
}
