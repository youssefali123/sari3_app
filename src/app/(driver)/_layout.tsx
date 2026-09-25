import React from 'react';
import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { ProfileErrorView } from '@/features/auth/presentation/components/ProfileErrorView';
import { OfflineNoticeBanner } from '@/features/drivers/presentation/components/OfflineNoticeBanner';

/**
 * Driver tab navigator — authenticated drivers only. The role check reads the
 * server-authoritative profile.role from AuthContext, never client metadata.
 * Malformed/missing profiles get an explicit recoverable error state instead
 * of a silent misroute (US7).
 */
export default function DriverLayout() {
  const { user, profile, isLoading, isProfileLoading, authError } = useAuth();

  if (isLoading || (user && isProfileLoading)) {
    // Session and profile are still resolving — redirecting here would read
    // a null role and misroute a driver into the customer app.
    return <View style={{ flex: 1 }} />;
  }

  if (!user) {
    // No returnTo for driver routes: drivers always go through login directly.
    return <Redirect href="/(auth)/login" />;
  }

  if (authError === 'profile_not_found') {
    return <ProfileErrorView />;
  }

  if (profile?.role !== 'driver') {
    return <Redirect href="/(customer)/(home)" />;
  }

  return (
    <View style={{ flex: 1 }}>
      <OfflineNoticeBanner />
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: '#0D6EFD',
        }}
      >
        <Tabs.Screen
          name="available-orders"
          options={{
            title: 'Available',
            headerShown: false,
            tabBarIcon: () => null,
          }}
        />
        <Tabs.Screen
          name="active-order"
          options={{
            title: 'Active',
            tabBarIcon: () => null,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
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
    </View>
  );
}
