import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface AreaEmptyStateProps {
  areaName: string | null;
  onSwitchArea: () => void;
}

/**
 * Dedicated empty state when the selected area has no stores (FR-018 /
 * spec edge case). Offers the area switcher instead of a generic error.
 */
export function AreaEmptyState({ areaName, onSwitchArea }: AreaEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📍</Text>
      <Text style={styles.title}>No stores found in this area yet</Text>
      <Text style={styles.message}>
        {areaName
          ? `We're not serving ${areaName} at the moment — we're expanding fast. Try another nearby area.`
          : "We're expanding fast. Try another nearby area."}
      </Text>
      <Text style={styles.switchLink} onPress={onSwitchArea}>
        Switch area
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  switchLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
