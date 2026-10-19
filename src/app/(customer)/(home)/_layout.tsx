import React from 'react';
import { Stack } from 'expo-router';
import { screenTransitions } from '@/shared/ui/motion';
import { useTheme } from '@/shared/ui/context/ThemeContext';

/**
 * Home group stack. The index (home screen) renders its own full-bleed
 * design header; detail screens use native horizontal slide transitions
 * for fluid, hardware-accelerated navigation with no white flashes.
 */
export default function HomeLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...screenTransitions.horizontal,
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen
        name="browse"
        options={{
          ...screenTransitions.horizontal,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <Stack.Screen
        name="promotion/[id]"
        options={{
          ...screenTransitions.horizontal,
          headerShown: true,
          title: 'العرض',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </Stack>
  );
}
