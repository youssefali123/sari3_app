import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useQuantityTick, usePressAnimation } from '@/shared/ui/motion';

interface QuantitySelectorProps {
  quantity: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
}

/**
 * Themed quantity stepper (feature 009 US4, contracts §11). Minus/plus
 * buttons flanking the quantity label; bounded by min (default 1) and max
 * (default 99); disabled at bounds. All touch targets >= 44pt.
 *
 * Quantity motion (feature 010 FR-012): the value ticks via the shared
 * `useQuantityTick` recipe and the steppers press via `usePressAnimation`;
 * props/API are unchanged.
 */
export function QuantitySelector({
  quantity,
  onChange,
  min = 1,
  max = 99,
}: QuantitySelectorProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const atMin = quantity <= min;
  const atMax = quantity >= max;

  const { tickStyle } = useQuantityTick(quantity);
  const decPress = usePressAnimation({ disabled: atMin });
  const incPress = usePressAnimation({ disabled: atMax });

  return (
    <View style={styles.container} accessibilityRole="adjustable">
      <AnimatedTouchableOpacity
        style={[styles.button, atMin && styles.buttonDisabled, decPress.animatedStyle]}
        onPress={() => onChange(Math.max(min, quantity - 1))}
        onPressIn={decPress.onPressIn}
        onPressOut={decPress.onPressOut}
        disabled={atMin}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        accessibilityState={{ disabled: atMin }}
      >
        <Text style={[styles.buttonText, atMin && styles.buttonTextDisabled]}>−</Text>
      </AnimatedTouchableOpacity>
      <Animated.View
        style={tickStyle}
        accessibilityLabel={`Quantity ${quantity}`}
      >
        <Text style={styles.quantity}>{quantity}</Text>
      </Animated.View>
      <AnimatedTouchableOpacity
        style={[styles.button, atMax && styles.buttonDisabled, incPress.animatedStyle]}
        onPress={() => onChange(Math.min(max, quantity + 1))}
        onPressIn={incPress.onPressIn}
        onPressOut={incPress.onPressOut}
        disabled={atMax}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        accessibilityState={{ disabled: atMax }}
      >
        <Text style={[styles.buttonText, atMax && styles.buttonTextDisabled]}>+</Text>
      </AnimatedTouchableOpacity>
    </View>
  );
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    button: {
      width: 44,
      height: 44,
      borderRadius: theme.radii.medium,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    buttonDisabled: {
      opacity: 0.4,
    },
    buttonText: {
      ...theme.typography.numeric,
      fontWeight: '700',
      fontSize: 18,
      color: theme.colors.textPrimary,
    },
    buttonTextDisabled: {
      opacity: 0.4,
    },
    quantity: {
      ...theme.typography.numeric,
      color: theme.colors.textPrimary,
      minWidth: 28,
      textAlign: 'center',
    },
  });
