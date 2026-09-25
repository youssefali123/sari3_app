import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';

/**
 * Customer tab layout. Guests browse freely (001 Scenario 1); a signed-in
 * user whose server-side profile resolves to the driver role is bounced to
 * the driver app — this also recovers a driver who landed here while their
 * profile fetch was still in flight.
 */
export default function CustomerLayout() {
  const { user, profile, isLoading, isProfileLoading } = useAuth();

  // Wait for the profile before trusting a null role.
  if (isLoading || (user && isProfileLoading)) {
    return null;
  }

  if (user && profile?.role === 'driver') {
    return <Redirect href="/(driver)/available-orders" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#0D6EFD',
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: () => null, // Will use proper icons in Phase 3+
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          headerShown: false,
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => null,
        }}
      />
    </Tabs>
  );
}
