import React from 'react';
import { Stack } from 'expo-router';
import { screenTransitions } from '@/shared/ui/motion';

/**
 * Dev-only gallery layout (feature 010). NOT linked from production
 * navigation (FR-028); screens register their transition preset statically
 * so Scenario 3 of the quickstart can drive each preset without any custom
 * navigator.
 */
export default function DevLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="motion-gallery" />
      <Stack.Screen name="demo-fade" options={screenTransitions.fade} />
      <Stack.Screen name="demo-horizontal" options={screenTransitions.horizontal} />
      <Stack.Screen name="demo-vertical" options={screenTransitions.vertical} />
      <Stack.Screen name="demo-modal" options={screenTransitions.sheet} />
    </Stack>
  );
}
