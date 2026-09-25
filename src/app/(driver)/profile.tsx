import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useDriverAvailability } from '@/features/drivers/application/hooks/useDriverAvailability';
import { AvailabilityToggle } from '@/features/drivers/presentation/components/AvailabilityToggle';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

/**
 * Driver profile: name/info, current availability with the shared
 * AvailabilityToggle, and sign-out (mirrors the customer profile structure).
 */
export default function DriverProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { isAvailable } = useDriverAvailability();

  async function handleSignOut() {
    try {
      // Centralized signOut: also purges the TanStack Query cache.
      await signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert(
        'Sign out failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.fullName}>{profile?.fullName || 'Driver'}</Text>
        <Text style={styles.role}>
          Driver account · Currently{' '}
          <Text style={isAvailable ? styles.available : styles.offline}>
            {isAvailable ? 'Available' : 'Offline'}
          </Text>
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Availability</Text>
        </View>
        <AvailabilityToggle />
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={() => void handleSignOut()}
        activeOpacity={0.7}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  fullName: {
    ...typography.h2,
    color: colors.textPrimary,
    padding: spacing.md,
    paddingBottom: 0,
  },
  role: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    padding: spacing.md,
    paddingTop: spacing.xs,
  },
  available: {
    color: colors.success,
    fontWeight: '600',
  },
  offline: {
    color: colors.error,
    fontWeight: '600',
  },
  toggleRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  toggleLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  signOutButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  signOutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
});
