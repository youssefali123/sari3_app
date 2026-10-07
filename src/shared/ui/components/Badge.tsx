import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'small' | 'medium';
}

/**
 * Themed badge (feature 009 US4, contracts §6). Background from the subtle
 * token, text from the strong token, pill radius, label typography.
 */
export function Badge({ label, variant = 'neutral', size = 'medium' }: BadgeProps) {
  const { theme } = useTheme();

  const palettes: Record<BadgeVariant, { background: string; text: string }> = {
    primary: {
      background: theme.colors.primarySubtle,
      text: theme.colors.primary,
    },
    success: {
      background: theme.colors.successSubtle,
      text: theme.colors.success,
    },
    warning: {
      background: theme.colors.warningSubtle,
      text: theme.colors.warning,
    },
    error: {
      background: theme.colors.errorSubtle,
      text: theme.colors.error,
    },
    info: {
      background: theme.colors.infoSubtle,
      text: theme.colors.info,
    },
    neutral: {
      background: theme.colors.disabled,
      text: theme.colors.textSecondary,
    },
  };

  const palette = palettes[variant];

  const container = {
    alignSelf: 'flex-start' as const,
    borderRadius: theme.radii.pill,
    backgroundColor: palette.background,
    paddingHorizontal: size === 'small' ? theme.spacing.sm : theme.spacing.md,
    paddingVertical: size === 'small' ? 2 : theme.spacing.xs,
  };

  const textStyle = {
    ...theme.typography.label,
    color: palette.text,
  };

  return (
    <View style={container} accessibilityRole="text" accessibilityLabel={label}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}
