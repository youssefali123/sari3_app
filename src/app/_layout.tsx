import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as ExpoNotifications from 'expo-notifications';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold,
} from '@expo-google-fonts/tajawal';
import { AppProviders } from '@/providers/AppProviders';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useNotificationSetup } from '@/features/notifications/application/hooks/useNotificationSetup';

// Keep the native splash visible until the auth session is resolved so the
// user never sees a flash of the wrong route group.
SplashScreen.preventAutoHideAsync();

// Foreground suppression (FR-016): while the app is open, realtime
// subscriptions are the sole signal — the OS shows no notification UI.
// Configured once at module scope so it covers every cold start.
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function RootNavigator() {
  const { isLoading, authError } = useAuth();
  // Tap deep-linking (warm + cold start) and offline registration retries.
  useNotificationSetup();

  // Tajawal font loading (feature 009 T015/T030): splash stays until fonts
  // resolve; a font error logs and proceeds rather than hanging forever.
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  useEffect(() => {
    if (fontError) {
      console.warn('Tajawal fonts failed to load:', fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (!isLoading && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, fontsLoaded, fontError]);

  const fontsPending = !fontsLoaded && !fontError;

  if ((isLoading && !authError) || fontsPending) {
    // Splash is still covering the screen; render a blank view beneath it.
    return <View style={{ flex: 1 }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(customer)" />
      <Stack.Screen name="(driver)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
