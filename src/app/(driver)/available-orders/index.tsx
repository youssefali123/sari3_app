import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { useDriverAvailability } from '@/features/drivers/application/hooks/useDriverAvailability';
import { useActiveOrder } from '@/features/drivers/application/hooks/useActiveOrder';
import { useAvailableOrders } from '@/features/drivers/application/hooks/useAvailableOrders';
import { AvailabilityToggle } from '@/features/drivers/presentation/components/AvailabilityToggle';
import { AvailableOrderCard } from '@/features/drivers/presentation/components/AvailableOrderCard';
import { AvailableOrderPreview } from '@/features/drivers/domain/entities/AvailableOrderPreview';

const NOT_AVAILABLE_MESSAGE = 'This order is no longer available.';

/**
 * Order pool for Available drivers. Offline hides the pool entirely (US1);
 * while holding an active order the server returns [] and the driver is
 * pointed at the Active tab (one active delivery per driver).
 */
export default function AvailableOrdersScreen() {
  const router = useRouter();
  const { isAvailable, isLoading: availabilityLoading } =
    useDriverAvailability();
  const { activeOrder, isLoading: activeOrderLoading } = useActiveOrder();
  const {
    orders,
    isLoading: poolLoading,
    error,
    claim,
    isClaiming,
    decline,
    decliningOrderId,
  } = useAvailableOrders();
  const [lostRaceOrderId, setLostRaceOrderId] = useState<string | null>(null);

  const handleOpen = (orderId: string) => {
    router.push(`/(driver)/available-orders/${orderId}`);
  };

  const handleQuickClaim = async (orderId: string) => {
    try {
      const result = await claim(orderId);
      if (result.claimed) {
        router.replace('/(driver)/active-order');
      } else {
        setLostRaceOrderId(orderId);
      }
    } catch {
      // Errors surface through the hook's `error`.
    }
  };

  const renderOrder = ({ item }: { item: AvailableOrderPreview }) => (
    <View>
      {lostRaceOrderId === item.id ? (
        <Text style={styles.lostRaceText}>{NOT_AVAILABLE_MESSAGE}</Text>
      ) : null}
      <AvailableOrderCard
        order={item}
        onOpen={() => handleOpen(item.id)}
        onClaim={() => handleQuickClaim(item.id)}
        isClaiming={isClaiming}
        onDecline={() => {
          decline(item.id).catch(() => {});
        }}
        isDeclining={decliningOrderId === item.id}
      />
    </View>
  );

  if (availabilityLoading || activeOrderLoading) {
    return (
      <View style={styles.container}>
        <AvailabilityToggle />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!isAvailable) {
    return (
      <View style={styles.container}>
        <AvailabilityToggle />
        <View style={styles.centered}>
          <Text style={styles.offlineText}>
            You are currently offline. Go online to view and accept orders.
          </Text>
        </View>
      </View>
    );
  }

  if (activeOrder) {
    return (
      <View style={styles.container}>
        <AvailabilityToggle />
        <View style={styles.centered}>
          <Text style={styles.offlineText}>
            You have an active delivery. Complete it before accepting new
            orders.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AvailabilityToggle />
      {poolLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.offlineText}>
            No available orders right now. New orders will appear here
            automatically.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.pool}
          contentContainerStyle={styles.poolContent}
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          ListFooterComponent={
            error ? <Text style={styles.errorText}>{error.message}</Text> : null
          }
        />
      )}
      {isClaiming ? (
        <View style={styles.claimingOverlay}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  offlineText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pool: {
    flex: 1,
  },
  poolContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  lostRaceText: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.md,
  },
  claimingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
});
