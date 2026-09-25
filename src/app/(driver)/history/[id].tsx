import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatDateTime } from '@/shared/utils/formatting';
import { useDriverHistory } from '@/features/drivers/application/hooks/useDriverHistory';

/**
 * Full detail of one delivery-history entry, including the release reason
 * where applicable. The entry is resolved from the cached history list.
 */
export default function DriverDeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = useDriverHistory();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.secondaryText}>Loading…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.secondaryText}>{error.message}</Text>
      </View>
    );
  }

  const entry = (data ?? []).find((e) => e.id === id);

  if (!entry) {
    return (
      <View style={styles.centered}>
        <Text style={styles.secondaryText}>
          This history entry is no longer available.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <View style={styles.card}>
        <Text style={styles.storeName}>{entry.storeName}</Text>
        <Text style={styles.row}>Status: {entry.finalStatus}</Text>
        <Text style={styles.row}>Order: {entry.orderId}</Text>
        <Text style={styles.row}>{formatDateTime(entry.orderDate)}</Text>
        {entry.finalStatus === 'released' ? (
          <Text style={styles.releaseReason}>
            Release reason: {entry.releaseReason ?? '—'}
          </Text>
        ) : null}
      </View>
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
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  storeName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  row: {
    ...typography.body,
    color: colors.textSecondary,
  },
  secondaryText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  releaseReason: {
    ...typography.body,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
});
