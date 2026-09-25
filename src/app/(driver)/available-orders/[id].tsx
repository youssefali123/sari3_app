import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatDateTime } from '@/shared/utils/formatting';
import { useAvailableOrders } from '@/features/drivers/application/hooks/useAvailableOrders';

const NOT_AVAILABLE_MESSAGE = 'This order is no longer available.';

/**
 * Privacy-safe preview of a single unclaimed order: the same fields as the
 * pool card plus an Accept action. Full delivery details are revealed only
 * after a successful claim.
 */
export default function AvailableOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { orders, isLoading, claim, isClaiming, error } = useAvailableOrders();
  const [notAvailable, setNotAvailable] = useState(false);

  const preview = orders.find((o) => o.id === id) ?? null;

  const handleAccept = async () => {
    if (!id) return;
    try {
      const result = await claim(id);
      if (result.claimed) {
        router.replace('/(driver)/active-order');
      } else {
        setNotAvailable(true);
      }
    } catch {
      // Mutation error surfaces through `error` below.
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (notAvailable || !preview) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notAvailableText}>{NOT_AVAILABLE_MESSAGE}</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Back to available orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.storeName}>{preview.storeName}</Text>
      <Text style={styles.storeNeighbourhood}>{preview.storeNeighbourhood}</Text>
      <Text style={styles.meta}>
        {preview.itemCount} {preview.itemCount === 1 ? 'item' : 'items'} ·{' '}
        {formatDateTime(preview.createdAt)}
      </Text>
      <Text style={styles.privacyNote}>
        Delivery address and customer contact are shown after you accept.
      </Text>

      {error ? <Text style={styles.errorText}>{error.message}</Text> : null}

      <TouchableOpacity
        style={[styles.acceptButton, isClaiming && styles.buttonDisabled]}
        onPress={handleAccept}
        disabled={isClaiming}
        activeOpacity={0.8}
      >
        {isClaiming ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.acceptButtonText}>Accept Order</Text>
        )}
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
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  storeName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  storeNeighbourhood: {
    ...typography.body,
    color: colors.textSecondary,
  },
  meta: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  privacyNote: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  notAvailableText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  acceptButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
