import React from 'react';
import { Stack } from 'expo-router';

/**
 * Home group stack. The index (home screen) renders its own full-bleed
 * design header, so the native header is hidden for it; detail screens
 * keep their headers.
 */
export default function HomeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="browse" />
      <Stack.Screen name="store/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="promotion/[id]" options={{ headerShown: true, title: 'العرض' }} />
    </Stack>
  );
}
