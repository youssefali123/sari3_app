import { useAuthContext } from '../context/AuthContext';

/**
 * Thin accessor for the shared auth state. Throws when used outside
 * AuthProvider so wiring mistakes surface immediately.
 */
export function useAuth() {
  return useAuthContext();
}
