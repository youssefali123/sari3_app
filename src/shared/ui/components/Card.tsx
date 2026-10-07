import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';

interface CardProps {
  variant?: CardVariant;
  children: React.ReactNode;
  style?: object;
  onPress?: () => void;
  testID?: string;
}

/**
 * Themed card container (feature 009 US4, contracts §2). `elevated` uses the
 * low shadow token; `outlined` uses the border token; `flat` has neither.
 */
export function Card({ variant = 'default', children, style, onPress, testID }: CardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const containerStyle = [
    styles.base,
    variant === 'elevated' && styles.elevated,
    variant === 'outlined' && styles.outlined,
    variant === 'flat' && styles.flat,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        testID={testID}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {children}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    base: {
      borderRadius: theme.radii.medium,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
    },
    elevated: {
      backgroundColor: theme.colors.surface,
      ...theme.shadows.low,
    },
    outlined: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    flat: {
      backgroundColor: theme.colors.surface,
    },
  });
