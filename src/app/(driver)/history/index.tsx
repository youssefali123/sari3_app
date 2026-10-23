import React, { useState } from 'react';
import { FlatList, Platform, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';
import { useColors } from '@/shared/ui/hooks/useColors';
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
import { classifyDriverError } from '@/features/drivers/infrastructure/driverErrorClassifier';
import { getDriverErrorMessage } from '@/features/drivers/presentation/messages/driversErrorMessages.ar';

/**
 * Newest-first delivery history: completed, declined, released, and cancelled.
 * Upgraded to SOURCE design language with AppScreen, BrandHeader, and EmptyState.
 */
export default function DriverHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useAppRouter();
  const colors = useColors();
  const { data, isLoading, isRefetching, error, refetch } = useDriverHistory();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing || isRefetching}
      onRefresh={() => void handleRefresh()}
      tintColor={colors.primary}
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
    />
  );

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
            message={getDriverErrorMessage(classifyDriverError(error).kind)}
            onRetry={() => void refetch()}
          />
        </View>
      ) : entries.length === 0 ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.centerContainer,
            {
              flexGrow: 1,
              paddingBottom:
                Math.max(insets.bottom, Platform.OS === 'android' ? 56 : 16) + 80,
            },
          ]}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          <EmptyState
            icon="receipt-outline"
            title="لا توجد طلبات سابقة"
            message="ستجد هنا سجل توصيلاتك والرحلات التي قمت بها فور إتمام أول طلب."
          />
        </ScrollView>
      ) : (
        <FlatList
          style={styles.container}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                Math.max(insets.bottom, Platform.OS === 'android' ? 56 : 16) + 80,
            },
          ]}
          data={entries}
          keyExtractor={(item) => item.id}
          refreshControl={refreshControl}
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
