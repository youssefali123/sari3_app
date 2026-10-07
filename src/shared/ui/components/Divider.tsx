import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type DividerOrientation = 'horizontal' | 'vertical';
type DividerSpacing = 'none' | 'sm' | 'md' | 'lg';

interface DividerProps {
  orientation?: DividerOrientation;
  spacing?: DividerSpacing;
  color?: string;
}

/**
 * Themed divider (feature 009 US1, contracts §14-region). Uses theme
 * divider/border colors and theme spacing for surrounding margins.
 */
export function Divider({
  orientation = 'horizontal',
  spacing = 'none',
  color,
}: DividerProps) {
  const { theme } = useTheme();

  const margin = spacing === 'none' ? 0 : theme.spacing[spacing];
  const lineColor = color ?? theme.colors.divider;

  return (
    <View
      style={[
        orientation === 'horizontal'
          ? [styles.horizontal, { marginVertical: margin }]
          : [styles.vertical, { marginHorizontal: margin }],
        { backgroundColor: lineColor },
      ]}
      accessibilityRole="none"
    />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  vertical: {
    width: StyleSheet.hairlineWidth,
    height: '100%',
  },
});
