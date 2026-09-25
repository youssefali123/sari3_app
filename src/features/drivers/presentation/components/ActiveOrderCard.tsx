import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency } from '@/shared/utils/formatting';
import { Order } from '@/features/orders/domain/entities/Order';

interface ActiveOrderCardProps {
  order: Order;
  /** Label of the single allowed next step, or null on terminal status. */
  nextStepLabel: string | null;
  onAdvance: () => void;
  isAdvancing: boolean;
  error?: Error | null;
}

/**
 * Full-detail card for the driver's active order: address, items, totals,
 * and the single next-step action. The button is absent on delivered —
 * advancement is strictly sequential and server-enforced.
 */
export function ActiveOrderCard({
  order,
  nextStepLabel,
  onAdvance,
  isAdvancing,
  error,
}: ActiveOrderCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.storeName}>{order.storeName}</Text>
      <Text style={styles.status}>Status: {order.status.replace(/_/g, ' ')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deliver to</Text>
        <Text style={styles.address}>{order.deliveryAddressSnapshot}</Text>
        {order.deliveryAddressLabel ? (
          <Text style={styles.addressLabel}>{order.deliveryAddressLabel}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items</Text>
        {order.items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemText}>
              {item.quantity}× {item.productName}
            </Text>
            <Text style={styles.itemText}>{formatCurrency(item.subtotal)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.itemRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(order.totalAmount)}</Text>
        </View>
        <Text style={styles.paymentNote}>Cash on delivery</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error.message}</Text> : null}

      {nextStepLabel ? (
        <TouchableOpacity
          style={[styles.advanceButton, isAdvancing && styles.buttonDisabled]}
          onPress={onAdvance}
          disabled={isAdvancing}
          activeOpacity={0.8}
        >
          {isAdvancing ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.advanceButtonText}>{nextStepLabel}</Text>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  storeName: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  status: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  address: {
    ...typography.body,
    color: colors.textPrimary,
  },
  addressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  itemText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    flex: 1,
  },
  totalLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  totalValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  paymentNote: {
    ...typography.caption,
    color: colors.textMuted,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  advanceButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  advanceButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});
