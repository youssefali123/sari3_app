import React from 'react';
import { View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { ProfileErrorView } from '@/features/auth/presentation/components/ProfileErrorView';
import { OfflineNoticeBanner } from '@/features/drivers/presentation/components/OfflineNoticeBanner';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { ModernFloatingTabBar } from '@/shared/ui/components/ModernFloatingTabBar';

/**
 * Driver tab navigator — authenticated drivers only. The role check reads the
 * server-authoritative profile.role from AuthContext, never client metadata.
 * Malformed/missing profiles get an explicit recoverable error state instead
 * of a silent misroute (US7).
 */
export default function DriverLayout() {
  const { user, profile, isLoading, isProfileLoading, authError } = useAuth();
  const { theme } = useTheme();

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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <OfflineNoticeBanner />
      <Tabs
        tabBar={(props) => <ModernFloatingTabBar {...props} />}
        screenOptions={{
          sceneStyle: { backgroundColor: theme.colors.background },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="available-orders"
          options={{
            title: 'الطلبات المتاحة',
          }}
        />
        <Tabs.Screen
          name="active-order"
          options={{
            title: 'طلباتي النشطة',
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'سجل التوصيل',
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'حسابي',
          }}
        />
      </Tabs>
    </View>
  );
}
