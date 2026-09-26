import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { OrderRepository } from '@/features/orders/domain/repositories/OrderRepository';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';
import { OrderSummaryCard } from '@/features/orders/presentation/OrderSummaryCard';
import { useReorder } from '@/features/orders/application/hooks/useReorder';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { ConfirmDialog } from '@/shared/ui/components/ConfirmDialog';
import { showAlert } from '@/shared/utils/alert';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';

const orderRepository: OrderRepository = new SupabaseOrderRepository();

export default function OrderHistoryScreen() {
  useRequireAuth('/(customer)/orders');
  const router = useRouter();
  const queryClient = useQueryClient();
  const customerId = useCurrentCustomerId();
  const reorder = useReorder();

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

  const hideOrder = async (orderId: string) => {
    try {
      await orderRepository.hideOrder(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders', customerId] });
    } catch (error) {
      showAlert('Could not hide order', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const [hideTargetId, setHideTargetId] = useState<string | null>(null);

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
            onOrderAgain={() => void reorder(item)}
            onHide={() => setHideTargetId(item.id)}
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
      <ConfirmDialog
        visible={hideTargetId !== null}
        title="Remove from history?"
        message="This order will be hidden from your history. It is kept securely on our servers."
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive
        onConfirm={() => {
          if (hideTargetId) void hideOrder(hideTargetId);
          setHideTargetId(null);
        }}
        onCancel={() => setHideTargetId(null)}
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
