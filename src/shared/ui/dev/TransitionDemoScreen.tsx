import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Text as SariText } from '@/shared/ui/components';

/**
 * Shared demo target screen for the transition presets (feature 010 US3).
 * Lives OUTSIDE the app/ directory so expo-router does not treat it as a
 * route. The transition itself is declared per-route in (dev)/_layout.tsx
 * via `screenTransitions.*` — nothing here animates.
 */
export function TransitionDemoScreen({
  preset,
  description,
}: {
  preset: string;
  description: string;
}) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      <SariText variant="headingSmall" style={styles.title}>
        Transition: {preset}
      </SariText>
      <SariText variant="bodyMedium" style={styles.description}>
        {description}
      </SariText>
      <SariText variant="bodySmall" style={styles.meta}>
        Applied via Expo Router screenOptions — no custom navigator.
      </SariText>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back to gallery</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
    },
    description: {
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    meta: {
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    backButton: {
      marginTop: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 4,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.radii.large,
      backgroundColor: theme.colors.primary,
    },
    backText: {
      color: theme.colors.textInverse,
      ...theme.typography.button,
    },
  });
