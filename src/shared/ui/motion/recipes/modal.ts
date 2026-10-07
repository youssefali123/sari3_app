import { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import {
  AnimatedStyle,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { presets } from '../presets';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Modal motion tuning (FR-014): calm settle, never bounce. */
export const modalMotion = {
  /** Surface starts this much smaller before settling to 1. */
  settleScale: 0.96,
  /** Surface starts this many px lower before settling. */
  settleDistance: 12,
};

export interface ModalMotion {
  /** Spread on the Animated.View scrim behind the dialog. */
  backdropStyle: AnimatedStyle<ViewStyle>;
  /** Spread on the Animated.View dialog surface. */
  surfaceStyle: AnimatedStyle<ViewStyle>;
}

/**
 * Modal/dialog recipe (feature 010 FR-014) — backdrop fade + surface
 * settle (subtle scale/translation) on open; reverse on close. No bounce,
 * no drama. Motion only supports the dialog; text/icon/color still carry
 * the meaning (FR-019 alignment).
 */
export function useModalMotion(visible: boolean): ModalMotion {
  const reducedMotion = useReducedMotion();
  const backdrop = useSharedValue(0);
  const surface = useSharedValue(0);

  useEffect(() => {
    const { duration, easing } = presets.normalInteraction(reducedMotion);
    const target = visible ? 1 : 0;
    backdrop.value = withTiming(target, { duration, easing });
    surface.value = withTiming(target, { duration, easing });
    return () => cancelAnimation(backdrop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reducedMotion]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  const surfaceStyle = useAnimatedStyle(() => {
    const remaining = 1 - surface.value;
    return {
      opacity: surface.value,
      transform: [
        { scale: 1 - remaining * (1 - modalMotion.settleScale) },
        { translateY: remaining * modalMotion.settleDistance },
      ],
    };
  });

  return { backdropStyle, surfaceStyle };
}
