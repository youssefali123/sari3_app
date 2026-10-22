import React, { useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { PrimaryButton } from '@/shared/ui/components/AppUI';
import { SwipeableBottomSheetModal } from '@/shared/ui/components/SwipeableBottomSheetModal';

interface OrderReleaseModalProps {
  visible: boolean;
  isSubmitting: boolean;
  error?: Error | null;
  onSubmit: (reason: string) => void;
  onClose: () => void;
}

/**
 * Modern, brand-aligned self-report modal for an order the driver cannot complete.
 * Uses smooth bottom sheet slide and animated keyboard elevation.
 */
export function OrderReleaseModal({
  visible,
  isSubmitting,
  error,
  onSubmit,
  onClose,
}: OrderReleaseModalProps) {
  const [reason, setReason] = useState('');
  const colors = useColors();
  const { theme } = useTheme();

  const trimmed = reason.trim();
  const valid = trimmed !== '';

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSubmit = () => {
    if (!valid || isSubmitting) return;
    Keyboard.dismiss();
    onSubmit(trimmed);
  };

  return (
    <SwipeableBottomSheetModal
      visible={visible}
      onClose={handleClose}
      showHandle={true}
      enableContentPan={true}
      header={
        <View style={styles.header}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: colors.destructive + '18',
                borderColor: colors.destructive + '35',
              },
            ]}
          >
            <Icon name="AlertTriangle" size={24} color={colors.destructive} />
          </View>

          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingSmall.fontFamily,
              },
            ]}
          >
            الاعتذار عن توصيل الطلب؟
          </Text>
          <Text
            style={[
              styles.description,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.bodyMedium.fontFamily,
              },
            ]}
          >
            سيعود الطلب مباشرة إلى قائمة الطلبات المتاحة ليتمكن كابتن آخر من استلامه. يرجى كتابة سبب الاعتذار أدناه.
          </Text>
        </View>
      }
    >

          {/* Reason Input */}
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.foreground,
                fontFamily: theme.typography.bodyMedium.fontFamily,
              },
            ]}
            value={reason}
            onChangeText={setReason}
            placeholder="اكتب سبب الاعتذار بالتفصيل (مطلوب)"
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            textAlign="right"
            textAlignVertical="top"
            editable={!isSubmitting}
          />

          {!valid && reason.length > 0 ? (
            <Text
              style={[
                styles.hint,
                {
                  color: colors.destructive,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              * كتابة السبب مطلوبة لإعادة إتاحة الطلب.
            </Text>
          ) : null}

          {error ? (
            <Text
              style={[
                styles.errorText,
                {
                  color: colors.destructive,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              {error.message}
            </Text>
          ) : null}

          {/* Action buttons */}
          <View style={styles.actions}>
            <PrimaryButton
              title="تأكيد الاعتذار وإعادة الطلب"
              loading={isSubmitting}
              disabled={!valid || isSubmitting}
              onPress={handleSubmit}
            />

            <Pressable
              onPress={handleClose}
              unstable_pressDelay={0}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.muted : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.cancelText,
                  {
                    color: colors.foreground,
                    fontFamily: theme.typography.button.fontFamily,
                  },
                ]}
              >
                الاستمرار في التوصيل
              </Text>
            </Pressable>
          </View>
    </SwipeableBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 88,
    fontSize: 14,
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
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
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
