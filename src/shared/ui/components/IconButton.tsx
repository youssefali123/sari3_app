import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';

type IconButtonSize = 'small' | 'medium' | 'large';
type IconButtonVariant = 'default' | 'ghost' | 'outlined';

interface IconButtonProps {
  name: string;
  onPress: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  color?: string;
  /** Required for screen readers — icons are not self-describing. */
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

const CONTAINER_SIZES: Record<IconButtonSize, number> = {
  small: 32,
  medium: 44,
  large: 56,
};

/**
 * Themed icon button (feature 009 US4). Wraps the shared Icon in a pressable
 * container — medium/large meet the 44pt touch-target minimum, and the
 * accessibility label is required because icons are not self-describing.
 */
export function IconButton({
  name,
  onPress,
  size = 'medium',
  variant = 'default',
  color,
  accessibilityLabel,
  disabled = false,
  testID,
}: IconButtonProps) {
  const { theme } = useTheme();
  const dimension = CONTAINER_SIZES[size];
  const styles = createStyles(theme, variant, dimension);
  const iconSize = Math.round(dimension * 0.5);
  const iconColor = color ?? theme.colors.textPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        disabled && styles.disabled,
        pressed && !disabled && { opacity: 0.75, transform: [{ scale: 0.92 }] },
      ]}
      onPress={onPress}
      unstable_pressDelay={0}
      hitSlop={6}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
    >
      <Icon name={name} size={iconSize} color={iconColor} accessibilityHidden />
    </Pressable>
  );
}

const createStyles = (
  theme: ReturnType<typeof useTheme>['theme'],
  variant: IconButtonVariant,
  dimension: number,
) =>
  StyleSheet.create({
    base: {
      width: dimension,
      height: dimension,
      borderRadius: theme.radii.medium,
      alignItems: 'center',
      justifyContent: 'center',
      ...(variant === 'outlined'
        ? {
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          }
        : variant === 'default'
          ? { backgroundColor: theme.colors.surface }
          : {}),
    },
    disabled: {
      opacity: 0.4,
    },
  });
