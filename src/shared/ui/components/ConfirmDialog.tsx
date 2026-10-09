import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Icon } from './Icon';
import { useColors, useTheme } from '@/shared/ui/theme';
import { fireHaptic, useModalMotion, useReducedMotion } from '@/shared/ui/motion';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function resolveDialogIcon(icon?: string, destructive?: boolean, title?: string): string {
  if (icon) return icon;
  if (!destructive) return 'CircleAlert';
  if (title?.includes('حذف') || title?.toLowerCase().includes('delete')) return 'Trash2';
  if (title?.includes('إلغاء') || title?.toLowerCase().includes('cancel')) return 'TriangleAlert';
  if (title?.includes('إخفاء') || title?.toLowerCase().includes('hide')) return 'EyeOff';
  return 'TriangleAlert';
}

/**
 * Premium, brand-aligned confirmation dialog (Modal-based) for Sari3:
 * - Smooth Reanimated fade & settle-scale entrance
 * - Haptic feedback for critical moments
 * - Distinctive semantic icon badges (danger crimson / brand gold)
 * - Tajawal typography with proper RTL hierarchy
 * - Tactile pressable buttons with native scaling
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'إلغاء',
  destructive = false,
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const { backdropStyle, surfaceStyle } = useModalMotion(visible);

  useEffect(() => {
    if (visible && destructive) {
      fireHaptic('importantConfirmation', reducedMotion);
    }
  }, [visible, destructive, reducedMotion]);

  const dialogIcon = resolveDialogIcon(icon, destructive, title);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {/* Backdrop overlay (dismiss on tap outside) */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onCancel}
            accessibilityRole="none"
            accessibilityLabel="إغلاق مربع التأكيد"
          />
        </Animated.View>

        {/* Dialog Card */}
        <Animated.View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
            surfaceStyle,
          ]}
          accessibilityRole="alert"
        >
          {/* Top semantic icon badge */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: destructive
                  ? 'rgba(201, 79, 72, 0.12)'
                  : colors.primarySubtle,
                borderColor: destructive
                  ? 'rgba(201, 79, 72, 0.25)'
                  : 'rgba(245, 189, 22, 0.35)',
              },
            ]}
          >
            <Icon
              name={dialogIcon}
              size={28}
              color={destructive ? colors.destructive : colors.primaryPressed}
            />
          </View>

          {/* Title */}
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingSmall.fontFamily,
              },
            ]}
          >
            {title}
          </Text>

          {/* Message */}
          <Text
            style={[
              styles.message,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.bodyMedium.fontFamily,
              },
            ]}
          >
            {message}
          </Text>

          {/* Actions Row */}
          <View style={styles.actionsRow}>
            {/* Confirm / Action CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                {
                  backgroundColor: destructive ? colors.destructive : colors.primary,
                  opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed && !loading ? 0.97 : 1 }],
                },
              ]}
              disabled={loading}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color={destructive ? colors.destructiveForeground : colors.primaryForeground}
                />
              ) : (
                <>
                  <Icon
                    name={destructive ? 'Trash2' : 'Check'}
                    size={16}
                    color={destructive ? colors.destructiveForeground : colors.primaryForeground}
                  />
                  <Text
                    style={[
                      styles.confirmButtonText,
                      {
                        color: destructive ? colors.destructiveForeground : colors.primaryForeground,
                        fontFamily: theme.typography.button.fontFamily,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {confirmLabel}
                  </Text>
                </>
              )}
            </Pressable>

            {/* Cancel CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  opacity: loading ? 0.5 : pressed ? 0.75 : 1,
                  transform: [{ scale: pressed && !loading ? 0.97 : 1 }],
                },
              ]}
              disabled={loading}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  {
                    color: colors.foreground,
                    fontFamily: theme.typography.button.fontFamily,
                  },
                ]}
                numberOfLines={1}
              >
                {cancelLabel}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  dialog: {
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.18,
        shadowRadius: 26,
      },
      android: {
        elevation: 14,
      },
      web: {
        boxShadow: '0 14px 34px rgba(0, 0, 0, 0.18)',
      },
    }),
  },
  iconBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
