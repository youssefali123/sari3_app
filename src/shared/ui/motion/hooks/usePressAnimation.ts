import { useCallback } from 'react';
import { ViewStyle } from 'react-native';
import {
  AnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from './useReducedMotion';

export interface PressAnimationOptions {
  /** Scale target while pressed (buttonPress ~0.95, cardPress ~0.98). */
  pressedScale?: number;
  /** Disabled controls never play the active press response (FR-004). */
  disabled?: boolean;
  /** Loading controls play a state transition instead of press (FR-004). */
  loading?: boolean;
}

export interface PressAnimation {
  /** Wire to the touchable's `onPressIn`. */
  onPressIn: () => void;
  /** Wire to the touchable's `onPressOut`. */
  onPressOut: () => void;
  /** Spread onto an `Animated.View` wrapping the control's content. */
  animatedStyle: AnimatedStyle<ViewStyle>;
}

/**
 * Shared press driver — responsive Reanimated scale with snappy spring rebound.
 */
export function usePressAnimation(
  options: PressAnimationOptions = {},
): PressAnimation {
  const {
    pressedScale = 0.95,
    disabled = false,
    loading = false,
  } = options;
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (disabled || loading) return;
    if (reducedMotion) {
      scale.value = pressedScale;
    } else {
      scale.value = withTiming(pressedScale, { duration: 60 });
    }
  }, [disabled, loading, reducedMotion, pressedScale, scale]);

  const onPressOut = useCallback(() => {
    if (disabled || loading) return;
    if (reducedMotion) {
      scale.value = 1;
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 380 });
    }
  }, [disabled, loading, reducedMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}

