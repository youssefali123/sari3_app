import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { ProfileErrorView } from '@/features/auth/presentation/components/ProfileErrorView';

/**
 * App entry point — role-based redirect.
 * Guests and customers land on the customer home (guest browsing); drivers
 * are routed to their available-orders queue based on the server-side role.
 * The redirect waits for the profile to resolve: profile is null while its
 * fetch is in flight, and reading role then would misroute drivers.
 */
export default function Index() {
  const { user, profile, isLoading, isProfileLoading, authError } = useAuth();

  if (isLoading || (user && isProfileLoading)) {
    // Splash is still showing; render nothing beneath it.
    return null;
  }

  if (authError === 'profile_not_found') {
    return <ProfileErrorView />;
  }

  if (user && profile?.role === 'driver') {
    return <Redirect href="/(driver)/available-orders" />;
  }

  return <Redirect href="/(customer)/(home)" />;
}
