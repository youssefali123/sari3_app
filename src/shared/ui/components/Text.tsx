import React from 'react';
import { Text as RNText } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ColorTokens } from '../theme/colors';
import { TypographyVariant } from '../theme/typography';

interface SariTextProps {
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
  align?: 'left' | 'center' | 'right' | 'auto';
  numberOfLines?: number;
  children: React.ReactNode;
  accessibilityRole?: 'header' | 'text' | 'none';
  style?: object;
  testID?: string;
}

/**
 * Themed text primitive (feature 009 US1, contracts §3). Spreads the active
 * theme's typography variant and resolves the color token — zero hardcoded
 * font values.
 */
export function SariText({
  variant = 'bodyMedium',
  color = 'textPrimary',
  align = 'auto',
  numberOfLines,
  children,
  accessibilityRole,
  style,
  testID,
}: SariTextProps) {
  const { theme } = useTheme();

  return (
    <RNText
      style={[
        theme.typography[variant],
        { color: theme.colors[color], textAlign: align },
        style,
      ]}
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      testID={testID}
    >
      {children}
    </RNText>
  );
}
