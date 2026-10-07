import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { EmptyState } from '@/shared/ui/components/AppUI';
import { BrandHeader } from '@/shared/ui/components/AppUI';
import { ConfirmDialog } from '@/shared/ui/components/ConfirmDialog';
import { showAlert } from '@/shared/utils/alert';
import { useColors, useTheme } from '@/shared/ui/theme';

const orderRepository: OrderRepository = new SupabaseOrderRepository();

const TERMINAL_STATUSES = ['delivered', 'cancelled', 'expired', 'rejected'];

export default function OrderHistoryScreen() {
  useRequireAuth('/(customer)/orders');
  const router = useRouter();
  const queryClient = useQueryClient();
  const customerId = useCurrentCustomerId();
  const reorder = useReorder();
  const { theme } = useTheme();
  const colors = useColors();
  const [showHistory, setShowHistory] = useState(false);
  const [hideTargetId, setHideTargetId] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['orders', customerId],
    queryFn: () => orderRepository.getCustomerOrders(customerId!),
    enabled: Boolean(customerId),
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const isTerminal = TERMINAL_STATUSES.includes(order.status);
      return showHistory ? isTerminal : !isTerminal;
    });
  }, [orders, showHistory]);

  const hideOrder = async (orderId: string) => {
    try {
      await orderRepository.hideOrder(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders', customerId] });
    } catch (error) {
      showAlert('تعذر إخفاء الطلب', error instanceof Error ? error.message : 'حاول مرة أخرى.');
    }
  };

  if (isLoading || !customerId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <BrandHeader title="طلباتي" subtitle="تابع طلباتك بكل سهولة" />
        <LoadingSpinner />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <BrandHeader title="طلباتي" subtitle="تابع طلباتك بكل سهولة" />
        <ErrorView message="تعذر تحميل الطلبات." onRetry={refetch} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BrandHeader title="طلباتي" subtitle="تابع طلباتك بكل سهولة" />

      {/* Segmented Control from SOURCE */}
      <View style={styles.segmentWrap}>
        <View style={[styles.segment, { backgroundColor: colors.muted }]}>
          <Pressable
            onPress={() => setShowHistory(false)}
            style={[
              styles.segmentButton,
              { backgroundColor: !showHistory ? colors.card : 'transparent' },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: !showHistory ? colors.foreground : colors.mutedForeground,
                  fontFamily: theme.typography.label.fontFamily,
                  fontWeight: !showHistory ? '700' : '500',
                },
              ]}
            >
              الطلبات الحالية
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setShowHistory(true)}
            style={[
              styles.segmentButton,
              { backgroundColor: showHistory ? colors.card : 'transparent' },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: showHistory ? colors.foreground : colors.mutedForeground,
                  fontFamily: theme.typography.label.fontFamily,
                  fontWeight: showHistory ? '700' : '500',
                },
              ]}
            >
              الطلبات السابقة
            </Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filteredOrders}
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
            title={showHistory ? 'لا توجد طلبات سابقة' : 'لا توجد طلبات حالية'}
            message={
              showHistory
                ? 'ستظهر هنا طلباتك المكتملة أو الملغاة.'
                : 'ستظهر طلباتك الجاري تجهيزها وتوصيلها هنا.'
            }
            icon="receipt-outline"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <ConfirmDialog
        visible={hideTargetId !== null}
        title="إخفاء من السجل؟"
        message="سيتم إخفاء هذا الطلب من سجلك في التطبيق."
        confirmLabel="إخفاء"
        cancelLabel="إلغاء"
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
  },
  segmentWrap: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  segment: {
    flexDirection: 'row-reverse',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 112,
    gap: 11,
  },
});
