import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  const [keyboardPadding, setKeyboardPadding] = useState(0);
  const trimmed = reason.trim();
  const valid = trimmed !== '';

  // Android Modals create their own window and do not inherit the app's
  // adjustResize behaviour, so the keyboard would cover the input. Track the
  // keyboard height and pad the sheet manually; iOS uses KeyboardAvoidingView.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardPadding(e.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardPadding(0);
    });
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { paddingBottom: spacing.lg + keyboardPadding }]}>
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
            title="Keep"
            variant="outline"
            onPress={onClose}
            disabled={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>
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
