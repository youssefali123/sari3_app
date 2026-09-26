import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Order } from '../domain/entities/Order';
import { OrderStatus } from '../domain/entities/OrderStatus';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency, formatDateTime } from '@/shared/utils/formatting';

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
  OrderStatus.Expired,
  OrderStatus.Rejected,
];

interface OrderSummaryCardProps {
  order: Order;
  onPress: () => void;
  /** "Order Again" action for terminal orders (feature 005 US5). */
  onOrderAgain?: () => void;
  /** "Remove from History" action for terminal orders (feature 005 US6). */
  onHide?: () => void;
}

/**
 * Compact order card for the customer order history list.
 */
export function OrderSummaryCard({ order, onPress, onOrderAgain, onHide }: OrderSummaryCardProps) {
  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const showActions = isTerminal && (onOrderAgain || onHide);
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
            order.status === 'expired' && styles.statusBad,
          ]}
        >
          {order.status.replace(/_/g, ' ')}
        </Text>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.date}>{formatDateTime(order.createdAt)}</Text>
        <Text style={styles.total}>{formatCurrency(order.totalAmount)}</Text>
      </View>
      {showActions ? (
        <View style={styles.actionRow}>
          {onOrderAgain ? (
            <TouchableOpacity style={styles.orderAgainButton} onPress={onOrderAgain} hitSlop={8}>
              <Text style={styles.orderAgainText}>Order Again</Text>
            </TouchableOpacity>
          ) : null}
          {onHide ? (
            <TouchableOpacity style={styles.hideButton} onPress={onHide} hitSlop={8}>
              <Text style={styles.hideText}>Remove from History</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  orderAgainButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  orderAgainText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  hideButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hideText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
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
