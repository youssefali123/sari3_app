import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors } from '@/shared/ui/hooks/useColors';
import { PrimaryButton } from '@/shared/ui/components/AppUI';

interface OrderReleaseModalProps {
  visible: boolean;
  isSubmitting: boolean;
  error?: Error | null;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/**
 * Self-report flow for an order the driver cannot complete.
 * Elevated to SOURCE design language with RTL layout and Arabic text.
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
  const colors = useColors();
  const trimmed = reason.trim();
  const valid = trimmed !== '';

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
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              paddingBottom: 24 + keyboardPadding,
            },
          ]}
        >
          <View style={[styles.indicator, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>
            الاعتذار عن توصيل الطلب؟
          </Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            سيعود الطلب مباشرة إلى قائمة الطلبات المتاحة ليتمكن سائق آخر من استلامه. يرجى ذكر سبب عدم التمكن من إكمال التوصيل.
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
              },
            ]}
            value={reason}
            onChangeText={setReason}
            placeholder="اكتب سبب الاعتذار (مطلوب)"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlign="right"
            textAlignVertical="top"
            editable={!isSubmitting}
          />
          {!valid ? (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              * كتابة السبب مطلوبة لإعادة إتاحة الطلب.
            </Text>
          ) : null}

          {error ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error.message}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              title="تأكيد الاعتذار وإعادة الطلب"
              loading={isSubmitting}
              onPress={() => onSubmit(trimmed)}
            />
            <Pressable
              onPress={onClose}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.cancelButton,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.cancelText, { color: colors.foreground }]}>
                الاستمرار في التوصيل
              </Text>
            </Pressable>
          </View>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  indicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 100,
    fontSize: 14,
    marginTop: 4,
  },
  hint: {
    fontSize: 11,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    marginTop: 6,
  },
  cancelButton: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
