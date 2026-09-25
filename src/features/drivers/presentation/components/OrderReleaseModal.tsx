import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/shared/ui/components/Button';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface OrderReleaseModalProps {
  visible: boolean;
  isSubmitting: boolean;
  error?: Error | null;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/**
 * Self-report flow for an order the driver cannot complete. The reason is
 * mandatory: submit stays disabled with an inline hint while it is empty or
 * whitespace. No daily/shift release cap is enforced (FR-0xx US8).
 */
export function OrderReleaseModal({
  visible,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: OrderReleaseModalProps) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const valid = trimmed !== '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Release this order?</Text>
          <Text style={styles.description}>
            The order will return to the available pool for other drivers.
            Please tell us why you cannot complete it.
          </Text>

          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (required)"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            editable={!isSubmitting}
          />
          {!valid ? (
            <Text style={styles.hint}>
              Please provide a reason for releasing this order.
            </Text>
          ) : null}

          {error ? <Text style={styles.errorText}>{error.message}</Text> : null}

          <Button
            title={isSubmitting ? 'Releasing…' : 'Release Order'}
            onPress={() => onSubmit(trimmed)}
            disabled={!valid || isSubmitting}
          />
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            disabled={isSubmitting}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 96,
    backgroundColor: colors.background,
    ...typography.body,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
  },
});
