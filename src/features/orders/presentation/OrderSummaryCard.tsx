import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Order } from '../domain/entities/Order';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency, formatDateTime } from '@/shared/utils/formatting';

interface OrderSummaryCardProps {
  order: Order;
  onPress: () => void;
}

/**
 * Compact order card for the customer order history list.
 */
export function OrderSummaryCard({ order, onPress }: OrderSummaryCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.topRow}>
        <Text style={styles.storeName} numberOfLines={1}>
          {order.storeName}
        </Text>
        <Text
          style={[
            styles.status,
            order.status === 'delivered' && styles.statusDelivered,
            order.status === 'cancelled' && styles.statusBad,
            order.status === 'rejected' && styles.statusBad,
          ]}
        >
          {order.status.replace(/_/g, ' ')}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.date}>{formatDateTime(order.createdAt)}</Text>
        <Text style={styles.total}>{formatCurrency(order.totalAmount)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  status: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.warning,
    textTransform: 'capitalize',
    marginLeft: spacing.sm,
  },
  statusDelivered: {
    color: colors.success,
  },
  statusBad: {
    color: colors.error,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  date: {
    ...typography.caption,
    color: colors.textMuted,
  },
  total: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
