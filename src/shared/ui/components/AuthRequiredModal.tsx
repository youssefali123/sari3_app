import React, { useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Icon } from './Icon';
import { useColors, useTheme } from '@/shared/ui/theme';
import { fireHaptic, useModalMotion, useReducedMotion } from '@/shared/ui/motion';

export interface AuthRequiredModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Brand-aligned authentication prompt dialog (Modal-based) for Sari3:
 * - Warns guests that a feature requires an active customer session
 * - Smooth Reanimated fade & settle-scale entrance
 * - Tactile brand gold icon badge
 * - Primary CTA takes user to Login
 * - Secondary CTA allows staying as a guest
 */
export function AuthRequiredModal({
  visible,
  title = 'التسجيل مطلوب',
  message = 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة والاستفادة من جميع المزايا.',
  confirmLabel = 'تسجيل الدخول',
  cancelLabel = 'إلغاء',
  icon = 'Lock',
  onConfirm,
  onCancel,
}: AuthRequiredModalProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();
  const { backdropStyle, surfaceStyle } = useModalMotion(visible);

  useEffect(() => {
    if (visible) {
      fireHaptic('importantConfirmation', reducedMotion);
    }
  }, [visible, reducedMotion]);

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
            accessibilityLabel="إغلاق التنبيه"
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
                backgroundColor: colors.primarySubtle,
                borderColor: 'rgba(245, 189, 22, 0.35)',
              },
            ]}
          >
            <Icon name={icon} size={30} color={colors.primaryPressed} />
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
            {/* Confirm / Go to Login CTA */}
            <Pressable
              style={({ pressed }) => [
                styles.confirmButton,
                {
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              onPress={() => {
                onConfirm();
              }}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
            >
              <Icon name="LogIn" size={18} color="#1A1D20" />
              <Text
                style={[
                  styles.confirmText,
                  {
                    color: '#1A1D20',
                    fontFamily: theme.typography.button.fontFamily,
                  },
                ]}
              >
                {confirmLabel}
              </Text>
            </Pressable>

            {/* Cancel Button */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                {
                  borderColor: colors.border,
                  backgroundColor: pressed ? colors.muted : 'transparent',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => {
                onCancel();
              }}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text
                style={[
                  styles.cancelText,
                  {
                    color: colors.mutedForeground,
                    fontFamily: theme.typography.button.fontFamily,
                  },
                ]}
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

export interface AuthRequiredViewProps {
  icon?: string;
  title?: string;
  message?: string;
  returnTo?: string;
  onLoginPress?: () => void;
  onBackPress?: () => void;
}

/**
 * Full page placeholder when a guest opens a protected screen directly.
 * Replaces infinite skeleton loading with an actionable brand card.
 */
export function AuthRequiredView({
  icon = 'Lock',
  title = 'التسجيل مطلوب',
  message = 'سجّل دخولك للوصول إلى هذه الصفحة والاستفادة من جميع المزايا.',
  returnTo,
  onLoginPress,
  onBackPress,
}: AuthRequiredViewProps) {
  const router = useRouter();
  const colors = useColors();
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();

  const handleLogin = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      router.push({
        pathname: '/(auth)/login',
        params: returnTo ? { returnTo } : {},
      });
    }
  };

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/(home)');
    }
  };

  return (
    <View style={viewStyles.container}>
      <View
        style={[
          viewStyles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            viewStyles.iconWrap,
            {
              backgroundColor: colors.primarySubtle,
              borderColor: 'rgba(245, 189, 22, 0.35)',
            },
          ]}
        >
          <Icon name={icon} size={38} color={colors.primaryPressed} />
        </View>

        <Text
          style={[
            viewStyles.title,
            {
              color: colors.foreground,
              fontFamily: theme.typography.headingMedium.fontFamily,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            viewStyles.message,
            {
              color: colors.mutedForeground,
              fontFamily: theme.typography.bodyMedium.fontFamily,
            },
          ]}
        >
          {message}
        </Text>

        <Pressable
          style={({ pressed }) => [
            viewStyles.loginBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={handleLogin}
          accessibilityRole="button"
          accessibilityLabel="تسجيل الدخول"
        >
          <Icon name="LogIn" size={20} color="#1A1D20" />
          <Text
            style={[
              viewStyles.loginBtnText,
              {
                color: '#1A1D20',
                fontFamily: theme.typography.button.fontFamily,
              },
            ]}
          >
            تسجيل الدخول
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            viewStyles.backBtn,
            {
              borderColor: colors.border,
              backgroundColor: pressed ? colors.muted : 'transparent',
            },
          ]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="العودة للرئيسية"
        >
          <Text
            style={[
              viewStyles.backBtnText,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.button.fontFamily,
              },
            ]}
          >
            العودة للرئيسية
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.18,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    includeFontPadding: false,
    lineHeight: 28,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
    includeFontPadding: false,
  },
  actionsRow: {
    width: '100%',
    gap: 12,
  },
  confirmButton: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 22,
  },
  cancelButton: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 22,
  },
});

const viewStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
  },
  iconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  loginBtn: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
    marginBottom: 12,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 22,
  },
  backBtn: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 22,
  },
});
