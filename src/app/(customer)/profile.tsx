import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

const LINKS: { label: string; route: string; emoji: string }[] = [
  { label: 'Saved Addresses', route: '/(customer)/addresses', emoji: '📍' },
  { label: 'Favorite Stores', route: '/(customer)/favorites/stores', emoji: '🏪' },
  { label: 'Favorite Products', route: '/(customer)/favorites/products', emoji: '🛍️' },
];

export default function CustomerProfileScreen() {
  const router = useRouter();
  // Protected screen: guests are redirected to login with returnTo (FR-003).
  useRequireAuth('/(customer)/profile');
  const { profile, signOut } = useAuth();

  async function handleSignOut() {
    try {
      // Centralized signOut: also purges the TanStack Query cache.
      await signOut();
      router.replace('/(customer)/(home)');
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
        <Text style={styles.fullName}>{profile?.fullName || 'My Profile'}</Text>
        {profile ? (
          <Text style={styles.role}>
            {profile.role === 'driver' ? 'Driver' : 'Customer'} account
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        {LINKS.map((link) => (
          <TouchableOpacity
            key={link.route}
            style={styles.linkRow}
            onPress={() => router.push(link.route as never)}
            activeOpacity={0.7}
          >
            <Text style={styles.linkEmoji}>{link.emoji}</Text>
            <Text style={styles.linkLabel}>{link.label}</Text>
            <Text style={styles.linkChevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={() => void handleSignOut()} activeOpacity={0.7}>
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
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  linkEmoji: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  linkLabel: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  linkChevron: {
    fontSize: 22,
    color: colors.textMuted,
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
