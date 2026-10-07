import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/shared/ui/components';
import { useDriverHistory } from '@/features/drivers/application/hooks/useDriverHistory';
import { DeliveryHistoryCard } from '@/features/drivers/presentation/components/DeliveryHistoryCard';
import { DeliveryHistoryEntry } from '@/features/drivers/domain/entities/DeliveryHistoryEntry';

/**
 * Newest-first delivery history: completed, declined, released, and cancelled.
 * Upgraded to SOURCE design language with AppScreen, BrandHeader, and EmptyState.
 */
export default function DriverHistoryScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useDriverHistory();

  const entries = data ?? [];

  return (
    <AppScreen>
      <BrandHeader title="سجل التوصيل" subtitle="الطلبات والرحلات السابقة" />

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <View style={styles.centerContainer}>
          <ErrorState
            title="تعذر تحميل السجل"
            message={error.message}
            onRetry={() => void refetch()}
          />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="📜"
            title="لا توجد طلبات سابقة"
            message="ستجد هنا سجل توصيلاتك والرحلات التي قمت بها فور إتمام أول طلب."
          />
        </View>
      ) : (
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
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 12,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
    paddingBottom: 60,
  },
});
