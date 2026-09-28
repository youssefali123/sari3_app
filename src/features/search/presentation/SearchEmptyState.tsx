import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface SearchEmptyStateProps {
  query: string;
  areaName: string | null;
}

/**
 * Zero-search-match state (feature 008 US1) — distinguishes "nothing matched"
 * from "no stores in area" and invites a shorter query.
 */
export function SearchEmptyState({ query, areaName }: SearchEmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>No results found</Text>
      <Text style={styles.message}>
        Nothing matches “{query}”
        {areaName ? ` in ${areaName}` : ''}. Try a shorter or different term.
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
    fontSize: 40,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
