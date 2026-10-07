import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface LoadingStateProps {
  size?: 'small' | 'large';
  color?: string;
  fullPage?: boolean;
}

/**
 * Themed loading state (feature 009 US1, contracts §13). Color defaults to
 * the theme primary. `LoadingSpinner` remains as a re-export alias.
 */
export function LoadingState({ size = 'large', color, fullPage = false }: LoadingStateProps) {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, fullPage && styles.fullPage]}>
      <ActivityIndicator size={size} color={color ?? theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPage: {
    flex: 1,
  },
});
