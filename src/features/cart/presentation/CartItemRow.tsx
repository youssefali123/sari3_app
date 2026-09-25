import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CartItem } from '../domain/entities/CartItem';
import { calculateItemTotal, calculateItemUnitPrice } from '../domain/cartUtils';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency } from '@/shared/utils/formatting';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
}

/**
 * Cart line item: product name, selected add-ons, unit price, quantity
 * stepper, and remove action.
 */
export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.productName}</Text>
        {item.selectedAddOns.length > 0 ? (
          <Text style={styles.addOns} numberOfLines={2}>
            {item.selectedAddOns.map((a) => a.name).join(', ')}
          </Text>
        ) : null}
        <Text style={styles.unitPrice}>
          {formatCurrency(calculateItemUnitPrice(item))} each
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.lineTotal}>{formatCurrency(calculateItemTotal(item))}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
          >
            <Text style={styles.stepText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.stepButton}
            onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
          >
            <Text style={styles.stepText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => onRemove(item.id)}>
          <Text style={styles.remove}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addOns: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  unitPrice: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  right: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  lineTotal: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  stepButton: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  quantity: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginHorizontal: spacing.sm,
    minWidth: 20,
    textAlign: 'center',
  },
  remove: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
});
