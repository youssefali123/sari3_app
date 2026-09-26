import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderRepository } from '@/features/orders/domain/repositories/OrderRepository';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';
import { DriverInfoService } from '@/features/orders/domain/services/DriverInfoService';
import { SupabaseDriverInfoService } from '@/features/orders/infrastructure/SupabaseDriverInfoService';
import { OrderRealtimeService } from '@/features/orders/domain/services/OrderRealtimeService';
import { SupabaseOrderRealtimeService } from '@/features/orders/infrastructure/SupabaseOrderRealtimeService';
import { OrderStatus } from '@/features/orders/domain/entities/OrderStatus';
import { useReorder } from '@/features/orders/application/hooks/useReorder';
import { ScopedDriverCard } from '@/features/orders/presentation/ScopedDriverCard';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { ConfirmDialog } from '@/shared/ui/components/ConfirmDialog';
import { showAlert } from '@/shared/utils/alert';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency, formatDateTime } from '@/shared/utils/formatting';

const orderRepository: OrderRepository = new SupabaseOrderRepository();
const driverInfoService: DriverInfoService = new SupabaseDriverInfoService();
const orderRealtimeService: OrderRealtimeService = new SupabaseOrderRealtimeService();

const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.Pending,
  OrderStatus.Accepted,
  OrderStatus.Preparing,
  OrderStatus.OutForDelivery,
];
const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
  OrderStatus.Expired,
];

const STATUS_EXPLANATIONS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.Expired]: 'This order timed out because no driver was available to accept it within 30 minutes.',
  [OrderStatus.Cancelled]: 'This order was cancelled.',
};

export default function OrderDetailScreen() {
  // Protected screen (returnTo the list, not the specific order id).
  useRequireAuth('/(customer)/orders');
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const reorder = useReorder();
  const [hiding, setHiding] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [hideConfirmVisible, setHideConfirmVisible] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderRepository.getOrderById(orderId),
    enabled: Boolean(orderId),
  });

  const isActive = order ? CANCELLABLE_STATUSES.includes(order.status) : false;
  const isCancellable = order ? CANCELLABLE_STATUSES.includes(order.status) : false;
  const isTerminal = order ? TERMINAL_STATUSES.includes(order.status) : false;

  // Driver contact details: fetched only while the order is actively
  // fulfilling; revoked automatically on terminal states (BR-008).
  const { data: driverInfo } = useQuery({
    queryKey: ['orderDriverInfo', orderId],
    queryFn: () => driverInfoService.getOrderDriverInfo(orderId),
    enabled: Boolean(orderId) && isActive,
  });

  // Live status updates via Realtime; the service writes the TanStack cache.
  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = orderRealtimeService.subscribeToOrderStatus(orderId, () => {
      // Cache is updated by the service; nothing further needed here.
    });
    return unsubscribe;
  }, [orderId]);

  // Customer self-service cancellation (US1) via the cancel_order RPC.
  const cancelMutation = useMutation({
    mutationFn: () => orderRepository.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      showAlert('Cancellation failed', error.message);
    },
  });

  const confirmCancel = () => {
    setCancelConfirmVisible(false);
    cancelMutation.mutate();
  };

  // History soft-hiding (US6) via the hide_order RPC.
  const hideOrder = async () => {
    setHiding(true);
    try {
      await orderRepository.hideOrder(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace('/(customer)/orders');
    } catch (error) {
      showAlert('Could not hide order', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setHiding(false);
    }
  };

  if (isLoading || !order) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load this order." onRetry={refetch} />;
  }

  const statusExplanation = STATUS_EXPLANATIONS[order.status];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.storeName}>{order.storeName}</Text>
        <Text style={styles.statusText}>Status: {order.status.replace(/_/g, ' ')}</Text>
        {statusExplanation ? (
          <Text style={styles.statusExplanation}>{statusExplanation}</Text>
        ) : null}
        <Text style={styles.dateText}>Placed {formatDateTime(order.createdAt)}</Text>
      </View>

      <ScopedDriverCard status={order.status} driverInfo={driverInfo ?? null} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery address</Text>
        <Text style={styles.addressText}>{order.deliveryAddressSnapshot}</Text>
        {order.deliveryAddressLabel ? (
          <Text style={styles.addressLabel}>{order.deliveryAddressLabel}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>
                {item.quantity} × {item.productName}
              </Text>
              {item.addonSnapshots.map((addon) => (
                <Text key={addon.addonId} style={styles.addOnText}>
                  + {addon.name} ({formatCurrency(addon.price)})
                </Text>
              ))}
            </View>
            <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(order.subtotalAmount)}</Text>
        </View>
        {order.discountAmount > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              Discount{order.couponCode ? ` (${order.couponCode})` : ''}
            </Text>
            <Text style={[styles.summaryValue, styles.discountValue]}>
              −{formatCurrency(order.discountAmount)}
            </Text>
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>{formatCurrency(order.deliveryFee)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
        </View>
        <Text style={styles.paymentMethod}>
          Payment: {order.paymentMethod.replace(/_/g, ' ')}
        </Text>
      </View>

      {isCancellable ? (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setCancelConfirmVisible(true)}
          disabled={cancelMutation.isPending}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <ConfirmDialog
        visible={cancelConfirmVisible}
        title="Cancel this order?"
        message="The order will be cancelled and stopped from further processing."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        onConfirm={confirmCancel}
        onCancel={() => setCancelConfirmVisible(false)}
      />
      <ConfirmDialog
        visible={hideConfirmVisible}
        title="Remove from history?"
        message="This order will be hidden from your history. It is kept securely on our servers."
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive
        onConfirm={() => {
          setHideConfirmVisible(false);
          void hideOrder();
        }}
        onCancel={() => setHideConfirmVisible(false)}
      />

      {isTerminal ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.orderAgainButton]}
            onPress={() => void reorder(order)}
            activeOpacity={0.8}
          >
            <Text style={styles.orderAgainText}>Order Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.hideButton]}
            onPress={() => setHideConfirmVisible(true)}
            disabled={hiding}
            activeOpacity={0.8}
          >
            <Text style={styles.hideText}>{hiding ? 'Removing…' : 'Remove from History'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  storeName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  statusText: {
    ...typography.bodySmall,
    color: colors.warning,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginTop: spacing.xs,
  },
  statusExplanation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  addressText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  addressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  addOnText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  itemSubtotal: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.body,
    color: colors.textPrimary,
  },
  discountValue: {
    color: colors.success,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  totalLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  paymentMethod: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textTransform: 'capitalize',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  orderAgainButton: {
    backgroundColor: colors.primary,
  },
  orderAgainText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  hideButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hideText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
