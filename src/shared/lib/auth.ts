import { useAuth } from '@/features/auth/application/hooks/useAuth';

/**
 * Returns the authenticated customer's user id (or null when signed out).
 * Delegates to the AuthContext — kept as a stable API for the existing
 * catalog/checkout/favorites/orders call-sites.
 */
export function useCurrentCustomerId(): string | null {
  const { user } = useAuth();
  return user?.id ?? null;
}
