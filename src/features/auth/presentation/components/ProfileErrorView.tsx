import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../application/hooks/useAuth';
import { Button } from '@/shared/ui/components/Button';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';import { typography } from '@/shared/ui/theme/typography';

/**
 * Rendered when an authenticated user's profile row cannot be loaded
 * (rare trigger-failure or database-inconsistency edge case). Offers a
 * profile re-fetch and a clean way out of the broken session.
 */
export function ProfileErrorView() {
  const { refreshProfile, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>Account Setup Incomplete</Text>
      <Text style={styles.description}>
        Your profile could not be loaded. This may be a temporary issue.
      </Text>
      <View style={styles.actions}>
        <Button title="Retry" onPress={() => void refreshProfile()} />
        <Button title="Sign Out" variant="outline" onPress={() => void signOut()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
