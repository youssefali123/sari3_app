import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { OrderRepository } from '@/features/orders/domain/repositories/OrderRepository';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';
import { OrderSummaryCard } from '@/features/orders/presentation/OrderSummaryCard';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';

const orderRepository: OrderRepository = new SupabaseOrderRepository();

export default function OrderHistoryScreen() {
  useRequireAuth('/(customer)/orders');
  const router = useRouter();
  const customerId = useCurrentCustomerId();

  const {
    data: orders,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['orders', customerId],
    queryFn: () => orderRepository.getCustomerOrders(customerId!),
    enabled: Boolean(customerId),
  });

  if (isLoading || !customerId) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load your orders." onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderSummaryCard
            order={item}
            onPress={() => router.push(`/(customer)/orders/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No orders yet"
            message="Your placed orders will appear here."
            emoji="📦"
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
});
