import { useCallback } from 'react';
import { ViewStyle } from 'react-native';
import {
  AnimatedStyle,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { presets } from '../presets';
import { useReducedMotion } from './useReducedMotion';

export interface PressAnimationOptions {
  /** Scale target while pressed (buttonPress ~0.97, cardPress ~0.99). */
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
 * Shared press driver (feature 010 FR-003) — one Reanimated scale shared
 * value driven by `withTiming` on the UI thread. Disabled/loading branches
 * short-circuit structurally (no animation is scheduled at all).
 */
export function usePressAnimation(
  options: PressAnimationOptions = {},
): PressAnimation {
  const { pressedScale = 0.97, disabled = false, loading = false } = options;
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const { duration, easing } = presets.fastInteraction(reducedMotion);

  const onPressIn = useCallback(() => {
    if (disabled || loading) return;
    // Reanimated shared values are mutable by design (UI-thread contract);
    // the immutability rule's structural analysis can't see that.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(pressedScale, { duration, easing });
  }, [disabled, loading, pressedScale, duration, easing, scale]);

  const onPressOut = useCallback(() => {
    if (disabled || loading) return;
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(1, { duration, easing });
  }, [disabled, loading, duration, easing, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}
