import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import {
  CANCELLED_NOTICE_QUERY_KEY,
  CancelledOrderNotice,
  useActiveOrder,
} from '@/features/drivers/application/hooks/useActiveOrder';
import { ActiveOrderCard } from '@/features/drivers/presentation/components/ActiveOrderCard';
import { OrderReleaseModal } from '@/features/drivers/presentation/components/OrderReleaseModal';
import { Order } from '@/features/orders/domain/entities/Order';
import { OrderRepository } from '@/features/orders/domain/repositories/OrderRepository';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';

const orderRepository: OrderRepository = new SupabaseOrderRepository();

/** Strictly sequential stepper: accepted → preparing → out_for_delivery → delivered. */
const NEXT_STEP_LABELS: Record<string, string> = {
  accepted: 'Store is Preparing',
  preparing: 'Out for Delivery',
  out_for_delivery: 'Delivered',
};

/**
 * Active delivery screen. Shows the full claimed order with the single
 * allowed next action; on delivered the active-order query returns null
 * (driver_profiles.current_order_id is cleared by the sync trigger) and the
 * driver lands on the empty state, free to accept new orders.
 */
export default function ActiveOrderScreen() {
  const {
    activeOrder,
    isLoading,
    error,
    advanceStatus,
    isAdvancing,
    advanceFailedWith,
    releaseOrder,
    isReleasing,
  } = useActiveOrder();
  const [releaseModalVisible, setReleaseModalVisible] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const lastActiveRef = useRef<Order | null>(null);
  const notifiedOrderIds = useRef(new Set<string>());
  const { data: cancelledNoticeFor } = useQuery<CancelledOrderNotice | null>({
    queryKey: CANCELLED_NOTICE_QUERY_KEY,
    queryFn: () => null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // US3: when the active order disappears, tell the driver WHY if the
  // customer cancelled it — never vanish silently. The notice lives in the
  // query cache and is cleared when the driver claims their next order.
  useEffect(() => {
    if (activeOrder) {
      lastActiveRef.current = activeOrder;
      return;
    }
    const last = lastActiveRef.current;
    if (!last || notifiedOrderIds.current.has(last.id)) return;
    notifiedOrderIds.current.add(last.id);
    orderRepository
      .getOrderById(last.id)
      .then((o) => {
        if (o.status === 'cancelled') {
          queryClient.setQueryData(CANCELLED_NOTICE_QUERY_KEY, {
            orderId: o.id,
            storeName: o.storeName,
          });
        }
      })
      .catch(() => undefined);
  }, [activeOrder, queryClient]);

  // US7: a concurrent customer cancellation produces a structured rejection —
  // show the cancelled notice (the card already renders it from status) and
  // let realtime refresh resolve the view. Never an unhandled SQL error.
  const handleAdvance = async () => {
    if (!activeOrder) return;
    try {
      const result = await advanceStatus(activeOrder.id);
      if (advanceFailedWith(result, 'ORDER_STATUS_CHANGED')) {
        Alert.alert('Order cancelled', 'The customer cancelled this order.');
      }
    } catch {
      // Other errors surface through the hook's error state.
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !activeOrder) {
    return (
      <View style={styles.centered}>
        <Text style={styles.secondaryText}>{error.message}</Text>
      </View>
    );
  }

  if (!activeOrder) {
    if (cancelledNoticeFor) {
      return (
        <View style={styles.centered}>
          <View style={styles.cancelledCard}>
            <Text style={styles.cancelledTitle}>Customer cancelled this order</Text>
            <Text style={styles.cancelledBody}>
              The customer cancelled your order from{' '}
              {cancelledNoticeFor?.storeName}. Your delivery slot is free
              again.
            </Text>
            <TouchableOpacity
              style={styles.cancelledButton}
              onPress={() => router.replace('/(driver)/available-orders')}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelledButtonText}>Browse Available Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.centered}>
        <Text style={styles.secondaryText}>
          No active delivery. Accept an order from the Available tab to start
          delivering.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <ActiveOrderCard
          order={activeOrder}
          nextStepLabel={NEXT_STEP_LABELS[activeOrder.status] ?? null}
          onAdvance={() => void handleAdvance()}
          isAdvancing={isAdvancing}
          error={error}
          customerCancelled={activeOrder.status === 'cancelled'}
          onReturnToPool={() => router.replace('/(driver)/available-orders')}
        />

        {activeOrder.status !== 'delivered' && activeOrder.status !== 'cancelled' ? (
          <TouchableOpacity
            style={styles.releaseButton}
            onPress={() => setReleaseModalVisible(true)}
            disabled={isReleasing}
            activeOpacity={0.7}
          >
            <Text style={styles.releaseButtonText}>
              Report Issue / Release Order
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <OrderReleaseModal
        visible={releaseModalVisible}
        isSubmitting={isReleasing}
        error={error}
        onSubmit={(reason) => {
          releaseOrder(activeOrder.id, reason)
            .then(() => {
              setReleaseModalVisible(false);
              // On success the active-order query resolves to null and the
              // screen shows the empty state — the driver can accept again.
            })
            .catch(() => {
              // Error surfaces through the hook into the modal.
            });
        }}
        onClose={() => setReleaseModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  releaseButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  releaseButtonText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
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
  cancelledCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.errorLight,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cancelledTitle: {
    ...typography.h3,
    color: colors.error,
    fontWeight: '700',
  },
  cancelledBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  cancelledButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  cancelledButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
});
