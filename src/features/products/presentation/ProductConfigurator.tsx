import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Product } from '../domain/entities/Product';
import { ProductAddOn } from '../domain/entities/ProductAddOn';
import { ProductVariant } from '../domain/entities/ProductVariant';
import { formatCurrency } from '@/shared/utils/formatting';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface ProductConfiguratorProps {
  product: Product;
  variants: ProductVariant[];
  addOns: ProductAddOn[];
  selectedVariantId: string | null;
  onSelectVariant: (variantId: string) => void;
  selectedAddOnIds: string[];
  onToggleAddOn: (addonId: string) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
}

/**
 * Extracted product configuration UI (feature 007): variant chips, add-on
 * checkbox list, quantity stepper, and the running total. The selection and
 * price-composition behavior is carried over verbatim from the removed
 * AddOnSelectorModal — the quantity stepper is new (the modal fixed it at 1).
 */
export function ProductConfigurator({
  product,
  variants,
  addOns,
  selectedVariantId,
  onSelectVariant,
  selectedAddOnIds,
  onToggleAddOn,
  quantity,
  onQuantityChange,
}: ProductConfiguratorProps) {
  const availableVariants = variants.filter((v) => v.isAvailable);
  const availableAddOns = addOns.filter((a) => a.isAvailable);

  const selectedVariant =
    availableVariants.find((v) => v.id === selectedVariantId) ?? null;

  const base = selectedVariant ? selectedVariant.price : product.price;
  const addonsTotal = availableAddOns
    .filter((a) => selectedAddOnIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const total = (base + addonsTotal) * quantity;

  return (
    <View style={styles.container}>
      {availableVariants.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Size (required)</Text>
          <View style={styles.variantRow}>
            {availableVariants.map((variant) => {
              const selected = selectedVariantId === variant.id;
              return (
                <TouchableOpacity
                  key={variant.id}
                  style={[styles.variantChip, selected && styles.variantChipSelected]}
                  onPress={() => onSelectVariant(variant.id)}
                >
                  <Text
                    style={[styles.variantLabel, selected && styles.variantTextSelected]}
                  >
                    {variant.name}
                  </Text>
                  <Text
                    style={[
                      styles.variantPrice,
                      selected && styles.variantTextSelected,
                    ]}
                  >
                    {formatCurrency(variant.price)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Add-ons (optional)</Text>
      {availableAddOns.length === 0 ? (
        <Text style={styles.emptyAddOns}>No add-ons available</Text>
      ) : (
        availableAddOns.map((addon) => {
          const selected = selectedAddOnIds.includes(addon.id);
          return (
            <TouchableOpacity
              key={addon.id}
              style={[styles.addOnRow, selected && styles.addOnRowSelected]}
              onPress={() => onToggleAddOn(addon.id)}
            >
              <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                {selected ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.addOnName}>{addon.name}</Text>
              <Text style={styles.addOnPrice}>+{formatCurrency(addon.price)}</Text>
            </TouchableOpacity>
          );
        })
      )}

      <View style={styles.quantityRow}>
        <Text style={styles.sectionTitle}>Quantity</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepperButton, quantity <= 1 && styles.stepperDisabled]}
            onPress={() => onQuantityChange(Math.max(1, quantity - 1))}
            disabled={quantity <= 1}
          >
            <Text style={styles.stepperButtonText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => onQuantityChange(Math.min(99, quantity + 1))}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  variantChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  variantChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  variantLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  variantTextSelected: {
    color: colors.primary,
  },
  variantPrice: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyAddOns: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  addOnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  addOnRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
  },
  addOnName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  addOnPrice: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  stepperDisabled: {
    opacity: 0.4,
  },
  stepperButtonText: {
    ...typography.h3,
    color: colors.primary,
  },
  quantityText: {
    ...typography.h3,
    color: colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  totalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  totalValue: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
});
