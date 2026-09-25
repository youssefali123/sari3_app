import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Product } from '../domain/entities/Product';
import { ProductAddOn } from '../domain/entities/ProductAddOn';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency } from '@/shared/utils/formatting';
import { Button } from '@/shared/ui/components/Button';

interface AddOnSelectorModalProps {
  visible: boolean;
  product: Product | null;
  addOns: ProductAddOn[];
  onClose: () => void;
  onConfirm: (selectedAddOnIds: string[]) => void;
}

/**
 * Modal for configuring optional binary add-ons (max quantity 1 each, BR-003).
 */
export function AddOnSelectorModal({
  visible,
  product,
  addOns,
  onClose,
  onConfirm,
}: AddOnSelectorModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const availableAddOns = useMemo(
    () => addOns.filter((a) => a.isAvailable),
    [addOns],
  );

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    const addonsTotal = availableAddOns
      .filter((a) => selectedIds.includes(a.id))
      .reduce((sum, a) => sum + a.price, 0);
    return product.price + addonsTotal;
  }, [product, availableAddOns, selectedIds]);

  function toggleAddOn(addonId: string) {
    setSelectedIds((current) =>
      current.includes(addonId)
        ? current.filter((id) => id !== addonId)
        : [...current, addonId],
    );
  }

  function handleConfirm() {
    onConfirm(selectedIds);
    setSelectedIds([]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {product ? (
            <>
              <Text style={styles.title}>{product.name}</Text>
              {product.description ? (
                <Text style={styles.description}>{product.description}</Text>
              ) : null}

              <Text style={styles.sectionTitle}>Add-ons (optional)</Text>
              {availableAddOns.length === 0 ? (
                <Text style={styles.emptyAddOns}>No add-ons available</Text>
              ) : (
                <FlatList
                  data={availableAddOns}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const selected = selectedIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        style={[styles.addOnRow, selected && styles.addOnRowSelected]}
                        onPress={() => toggleAddOn(item.id)}
                      >
                        <View
                          style={[styles.checkbox, selected && styles.checkboxSelected]}
                        >
                          {selected ? <Text style={styles.checkmark}>✓</Text> : null}
                        </View>
                        <Text style={styles.addOnName}>{item.name}</Text>
                        <Text style={styles.addOnPrice}>
                          +{formatCurrency(item.price)}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              <View style={styles.footer}>
                <View>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{formatCurrency(totalPrice)}</Text>
                </View>
                <View style={styles.footerButtons}>
                  <Button title="Cancel" variant="outline" onPress={onClose} />
                  <Button title="Add to Cart" onPress={handleConfirm} />
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyAddOns: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  addOnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  addOnRowSelected: {
    backgroundColor: colors.background,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  addOnName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  addOnPrice: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  totalValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
