import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency } from '@/shared/utils/formatting';

interface CouponInputSectionProps {
  /** Currently applied coupon code, if any (single coupon per order, BR-004). */
  appliedCode: string | null;
  /** Server-validated discount in piasters (0 when no valid coupon). */
  discountAmount: number;
  rejectionReason: string | null;
  isValidating: boolean;
  onApply: (code: string) => void;
  onRemove: () => void;
}

/**
 * Single-coupon input at checkout. Applying a new code replaces the previous
 * one; the displayed discount is always the server-computed amount (BR-004,
 * FR-013, FR-014).
 */
export function CouponInputSection({
  appliedCode,
  discountAmount,
  rejectionReason,
  isValidating,
  onApply,
  onRemove,
}: CouponInputSectionProps) {
  const [code, setCode] = useState('');

  function handleApply() {
    const trimmed = code.trim();
    if (!trimmed) return;
    onApply(trimmed.toUpperCase());
    setCode('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Coupon</Text>
      {appliedCode ? (
        <View style={styles.appliedRow}>
          <View style={styles.appliedInfo}>
            <Text style={styles.appliedCode}>{appliedCode}</Text>
            {discountAmount > 0 ? (
              <Text style={styles.appliedDiscount}>
                −{formatCurrency(discountAmount)} discount applied
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onRemove} hitSlop={8}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter coupon code"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.applyButton, (!code.trim() || isValidating) && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={!code.trim() || isValidating}
          >
            {isValidating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.applyButtonText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {rejectionReason ? <Text style={styles.rejection}>{rejectionReason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appliedInfo: {
    flex: 1,
  },
  appliedCode: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  appliedDiscount: {
    ...typography.bodySmall,
    color: colors.success,
    marginTop: 2,
  },
  removeText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.background,
    flex: 1,
  },
  applyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  applyButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  applyButtonText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  rejection: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.sm,
  },
});
