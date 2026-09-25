import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { useActiveOrder } from '@/features/drivers/application/hooks/useActiveOrder';
import { ActiveOrderCard } from '@/features/drivers/presentation/components/ActiveOrderCard';
import { OrderReleaseModal } from '@/features/drivers/presentation/components/OrderReleaseModal';

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
    releaseOrder,
    isReleasing,
  } = useActiveOrder();
  const [releaseModalVisible, setReleaseModalVisible] = useState(false);

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
          onAdvance={() => advanceStatus(activeOrder.id).catch(() => {})}
          isAdvancing={isAdvancing}
          error={error}
        />

        {activeOrder.status !== 'delivered' ? (
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
});
