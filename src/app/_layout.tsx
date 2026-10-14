import React, { useEffect, useState } from 'react';
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
import { AppSplashScreen } from '@/shared/ui/components';

// Keep the native splash screen until the JS bundle mounts
SplashScreen.preventAutoHideAsync().catch(() => {});

// Foreground suppression (FR-016): while the app is open, realtime
// subscriptions are the sole signal — the OS shows no notification UI.
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

  // Tajawal font loading (feature 009 T015/T030)
  const [fontsLoaded, fontError] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  // State controls for smooth animated splash lifecycle
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [safetyTimeoutElapsed, setSafetyTimeoutElapsed] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // 1. Hide native static splash immediately so AppSplashScreen takes over seamlessly
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // 2. Minimum display time: 1.5 seconds so user enjoys the animated entrance
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // 3. Safety timeout (4.5s): guarantees app entry even with poor network
  useEffect(() => {
    const timer = setTimeout(() => {
      setSafetyTimeoutElapsed(true);
    }, 4500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontError) {
      console.warn('Tajawal fonts failed to load:', fontError);
    }
  }, [fontError]);

  // Essential prerequisites are ready
  const isAppReady =
    safetyTimeoutElapsed ||
    ((!isLoading || !!authError) && (fontsLoaded || !!fontError));

  // Dismiss splash when prerequisites are satisfied AND minimum 1.5s time has elapsed
  const canDismissSplash = isAppReady && minTimeElapsed;

  return (
    <View style={{ flex: 1, backgroundColor: '#1A1915' }}>
      {/* Root stack mounts underneath once ready */}
      {isAppReady ? (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(driver)" />
        </Stack>
      ) : null}

      {/* Animated Splash Screen overlays on top and fades out smoothly */}
      {showSplash ? (
        <AppSplashScreen
          isReady={canDismissSplash}
          onAnimationEnd={() => setShowSplash(false)}
          fontsLoaded={fontsLoaded}
        />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
