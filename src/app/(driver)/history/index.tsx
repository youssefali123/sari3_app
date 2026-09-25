import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { useDriverHistory } from '@/features/drivers/application/hooks/useDriverHistory';
import { DeliveryHistoryCard } from '@/features/drivers/presentation/components/DeliveryHistoryCard';
import { DeliveryHistoryEntry } from '@/features/drivers/domain/entities/DeliveryHistoryEntry';

/**
 * Newest-first delivery history: completed, declined, released (with reason),
 * and cancelled entries from the get_driver_history RPC.
 */
export default function DriverHistoryScreen() {
  const router = useRouter();
  const { data, isLoading, error } = useDriverHistory();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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

  const entries = data ?? [];

  if (entries.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.secondaryText}>
          No delivery history yet. Completed, declined, and released orders
          will appear here.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }: { item: DeliveryHistoryEntry }) => (
        <DeliveryHistoryCard
          entry={item}
          onOpen={() => router.push(`/(driver)/history/${item.id}`)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  secondaryText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
