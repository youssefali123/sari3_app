import React from 'react';
import { TextInput, View, Text, TextInputProps, ViewStyle, I18nManager } from 'react-native';
import { useTheme } from '@/shared/ui/context/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  containerStyle?: ViewStyle;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Themed text input (feature 009 US1, contracts \u00a74). Focused/error/
 * disabled states resolve from the active theme; RTL handled internally via
 * I18nManager. Backwards-compatible: label/error/containerStyle/style props
 * preserved from the catalog-checkout-foundation era.
 */
export function Input({
  label,
  error,
  disabled,
  leadingIcon,
  trailingAction,
  containerStyle,
  accessibilityLabel,
  testID,
  style,
  editable,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const isInputDisabled = disabled || editable === false;

  const borderColor = error ? theme.colors.error : theme.colors.border;

  const textAlign = I18nManager.isRTL ? ('right' as const) : ('left' as const);

  return (
    <View style={[styles.container(theme), containerStyle]}>
      {label ? (
        <Text style={[styles.label(theme), error && styles.labelError]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.inputWrapper(theme),
          { borderColor },
          isInputDisabled && styles.inputDisabled(theme),
        ]}
      >
        {leadingIcon ? <View style={styles.leadingIcon}>{leadingIcon}</View> : null}
        <TextInput
          style={[
            styles.input(theme),
            { textAlign },
            isInputDisabled && styles.inputDisabledText,
            style,
          ]}
          placeholderTextColor={theme.colors.textMuted}
          editable={!isInputDisabled}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled: isInputDisabled }}
          testID={testID}
          {...props}
        />
        {trailingAction ? <View style={styles.trailingAction}>{trailingAction}</View> : null}
      </View>
      {error ? <Text style={styles.error(theme)}>{error}</Text> : null}
    </View>
  );
}

const styles = {
  container: (theme: ReturnType<typeof useTheme>['theme']) => ({
    marginBottom: theme.spacing.md,
  }),
  label: (theme: ReturnType<typeof useTheme>['theme']) => ({
    ...theme.typography.label,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  }),
  labelError: {
    color: '#E74C3C' as string, // resolved error color applied via styles.error below
  },
  inputWrapper: (theme: ReturnType<typeof useTheme>['theme']) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.medium,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  }),
  inputDisabled: (theme: ReturnType<typeof useTheme>['theme']) => ({
    backgroundColor: theme.colors.disabled,
  }),
  inputDisabledText: {
    opacity: 0.5,
  },
  leadingIcon: {
    marginRight: 12, // physical margin; RTL mirrors via I18nManager at OS level
  },
  trailingAction: {
    marginLeft: 8,
  },
  input: (theme: ReturnType<typeof useTheme>['theme']) => ({
    flex: 1,
    ...theme.typography.bodyMedium,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm + 4,
  }),
  error: (theme: ReturnType<typeof useTheme>['theme']) => ({
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  }),
};

