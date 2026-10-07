import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { AnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface StickyBarProps {
  /** Bar content — the caller composes the layout (total, CTA, stepper…). */
  children: React.ReactNode;
  /** Optional feedback pulse from the shared add-to-cart recipe. */
  pulseStyle?: AnimatedStyle<ViewStyle>;
}

/**
 * Sticky bottom action bar (feature 011 design identity — shared by store
 * detail and product detail): brand-gold, extra-large radii, floating above
 * the home indicator with a safe-area inset. The caller owns the content.
 */
export function StickyBar({ children, pulseStyle }: StickyBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  return (
    <View
      style={[styles.wrap, { paddingBottom: insets.bottom + 8 }]}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.bar, pulseStyle]}>{children}</Animated.View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
    },
    bar: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.extraLarge,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.md,
      ...theme.shadows.high,
    },
  });
