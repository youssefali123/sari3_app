import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

/**
 * Themed filter chip (feature 009 US4, contracts §7). Selected uses the
 * primary background with inverse text; unselected uses surface/border.
 * Minimum 44pt touch target.
 */
export function Chip({ label, selected = false, onPress, disabled = false, icon }: ChipProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const textColor = selected ? theme.colors.textInverse : theme.colors.textPrimary;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        selected ? styles.selected : styles.unselected,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
    >
      {icon ? <View style={styles.iconGap}>{icon}</View> : null}
      <Text style={[styles.label, { color: textColor }, disabled && styles.disabledText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    selected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    unselected: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    disabled: {
      opacity: 0.5,
    },
    label: {
      ...theme.typography.label,
    },
    iconGap: {
      marginRight: theme.spacing.sm,
    },
    disabledText: {
      opacity: 0.5,
    },
  });
