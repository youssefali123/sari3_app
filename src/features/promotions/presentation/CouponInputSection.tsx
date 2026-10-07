import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { formatCurrencyCompact } from '@/shared/utils/formatting';

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
 * كود الخصم عند الدفع (Phase 3 design): themed input card in the app
 * identity. Applying a new code replaces the previous one; the displayed
 * discount is always the server-computed amount (BR-004, FR-013, FR-014).
 */
export function CouponInputSection({
  appliedCode,
  discountAmount,
  rejectionReason,
  isValidating,
  onApply,
  onRemove,
}: CouponInputSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [code, setCode] = useState('');

  function handleApply() {
    const trimmed = code.trim();
    if (!trimmed) return;
    onApply(trimmed.toUpperCase());
    setCode('');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>كود الخصم</Text>
      {appliedCode ? (
        <View style={styles.appliedRow}>
          <View style={styles.appliedInfo}>
            <Text style={styles.appliedCode}>{appliedCode}</Text>
            {discountAmount > 0 ? (
              <Text style={styles.appliedDiscount}>
                − {formatCurrencyCompact(discountAmount)} خصم مطبق
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onRemove} hitSlop={8}>
            <Text style={styles.removeText}>إزالة</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="اكتب كود الخصم"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              textAlign="right"
            />
            <TouchableOpacity
              style={[styles.applyButton, (!code.trim() || isValidating) && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={!code.trim() || isValidating}
              accessibilityRole="button"
              accessibilityLabel="تطبيق كود الخصم"
            >
              {isValidating ? (
                <ActivityIndicator size="small" color={theme.colors.secondary} />
              ) : (
                <Text style={styles.applyText}>تطبيق</Text>
              )}
            </TouchableOpacity>
          </View>
          {rejectionReason ? (
            <Text style={styles.rejection}>{rejectionReason}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    title: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
      textAlign: 'right',
    },
    appliedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    appliedInfo: {
      gap: 2,
    },
    appliedCode: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
    },
    appliedDiscount: {
      ...theme.typography.caption,
      color: theme.colors.success,
      fontWeight: '700',
    },
    removeText: {
      ...theme.typography.label,
      color: theme.colors.error,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      ...theme.typography.bodyMedium,
      color: theme.colors.textPrimary,
    },
    applyButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.medium,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 72,
    },
    applyButtonDisabled: {
      opacity: 0.5,
    },
    applyText: {
      ...theme.typography.label,
      color: theme.colors.secondary,
    },
    rejection: {
      ...theme.typography.caption,
      color: theme.colors.error,
      textAlign: 'right',
    },
  });
