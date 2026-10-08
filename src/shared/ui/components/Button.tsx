import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Theme } from '@/shared/ui/theme';
import {
  buttonPress,
  presets,
  usePressAnimation,
  useReducedMotion,
} from '@/shared/ui/motion';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outlined'
  | 'inverted'
  | 'ghost'
  | 'destructive'
  // Legacy alias kept for existing call sites (feature 009 backwards compat):
  | 'outline';

export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  /** Button text. New code should use `label`; `title` is a legacy alias. */
  label?: string;
  /** @deprecated legacy alias for `label` (catalog-checkout-foundation era). */
  title?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Legacy size keys (sm/md/lg) accepted for backwards compatibility. */
  size?: ButtonSize | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

type SizeKey = 'small' | 'medium' | 'large';

/** Legacy size keys (sm/md) map onto the new size scale. */
function normalizeSize(size?: string): SizeKey {
  if (size === 'sm' || size === 'small') return 'small';
  if (size === 'lg' || size === 'large') return 'large';
  return 'medium';
}

/** Legacy 'outline' maps onto the new 'outlined' variant. */
function normalizeVariant(variant?: string): ButtonVariant {
  if (variant === 'outline') return 'outlined';
  if (
    variant === 'primary' ||
    variant === 'secondary' ||
    variant === 'outlined' ||
    variant === 'inverted' ||
    variant === 'ghost' ||
    variant === 'destructive'
  ) {
    return variant;
  }
  return 'primary';
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

/**
 * Themed button (feature 009 US1, contracts \u00a71). All colors, typography,
 * radii, and spacing resolve from the active theme — zero hardcoded values.
 * Backwards-compatible: legacy `title`/`outline`/`sm`/`md`/`lg` props keep
 * working; new code uses `label`/`outlined`/`small`/`medium`/`large`.
 *
 * Press motion (feature 010 FR-003/FR-004): consumes the shared
 * `usePressAnimation` driver in place — one press behavior across all six
 * variants; disabled plays nothing; loading plays a short opacity
 * transition instead of press. No separate AnimatedButton exists.
 */
export function Button({
  label,
  title,
  onPress,
  variant,
  size,
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  accessibilityLabel,
  testID,
  style,
  textStyle,
}: ButtonProps) {
  const { theme } = useTheme();
  const reducedMotion = useReducedMotion();

  const resolvedVariant = normalizeVariant(variant);
  const resolvedSize = normalizeSize(size);
  const text = label ?? title ?? '';
  const isDisabled = disabled || loading;
  const iconOnLeft = iconPosition === 'left';

  const palette = buttonPalettes(theme, resolvedVariant);
  const sizeStyle = sizeStyles(theme)[resolvedSize];

  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation({
    ...buttonPress,
    disabled,
    loading,
  });

  // Loading state transition (FR-004): short opacity fade instead of press.
  const loadingOpacity = useSharedValue(1);
  const loadingStyle = useAnimatedStyle(() => ({
    opacity: loadingOpacity.value,
  }));
  React.useEffect(() => {
    if (!loading) return;
    const { duration, easing } = presets.fastInteraction(reducedMotion);
    // Reanimated shared values are mutable by design (UI-thread contract).
    // eslint-disable-next-line react-hooks/immutability
    loadingOpacity.value = 0.6;
    loadingOpacity.value = withTiming(1, { duration, easing });
  }, [loading, reducedMotion, loadingOpacity]);

  return (
    <AnimatedTouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={isDisabled}
      delayPressIn={0}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? text}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={[
        baseStyle(theme),
        sizeStyle,
        palette.container,
        fullWidth && styles.fullWidth,
        isDisabled && disabledStyle(theme),
        animatedStyle,
        loading && loadingStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.textStyle.color} />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconOnLeft ? <View style={styles.iconGap}>{icon}</View> : null}
          <Text
            style={[
              textStyleStyle(theme),
              palette.textStyle,
              isDisabled && styles.disabledText,
              textStyle,
            ]}
          >
            {text}
          </Text>
          {icon && !iconOnLeft ? <View style={styles.iconGap}>{icon}</View> : null}
        </View>
      )}
    </AnimatedTouchableOpacity>
  );
}

interface ButtonPalette {
  container: ViewStyle;
  textStyle: TextStyle;
}

function buttonPalettes(theme: Theme, variant: ButtonVariant): ButtonPalette {
  const { colors } = theme;
  switch (variant) {
    case 'secondary':
      return {
        container: { backgroundColor: colors.secondary },
        textStyle: { color: colors.textInverse },
      };
    case 'outlined':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        },
        textStyle: { color: colors.primary },
      };
    case 'inverted':
      return {
        container: { backgroundColor: colors.textInverse },
        textStyle: { color: colors.textPrimary },
      };
    case 'ghost':
      return {
        container: { backgroundColor: 'transparent' },
        textStyle: { color: colors.primary },
      };
    case 'destructive':
      return {
        container: { backgroundColor: colors.error },
        textStyle: { color: colors.textInverse },
      };
    case 'primary':
    default:
      return {
        container: { backgroundColor: colors.primary },
        textStyle: { color: colors.textInverse },
      };
  }
}

const baseStyle = (theme: Theme) => ({
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  borderRadius: theme.radii.large,
  minHeight: 44, // touch-target minimum (US6)
});

const disabledStyle = (theme: Theme) => ({
  opacity: 0.5,
  backgroundColor: theme.colors.disabled,
});

const textStyleStyle = (theme: Theme) => ({
  ...theme.typography.button,
});

const sizeStyles = (theme: Theme): Record<SizeKey, ViewStyle> => ({
  small: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    minHeight: 44,
  },
  medium: {
    paddingVertical: theme.spacing.sm + 4,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 44,
  },
  large: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    minHeight: 48,
  },
});

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGap: {
    marginHorizontal: 2,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabledText: {
    opacity: 0.7,
  },
});
