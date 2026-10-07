import { useEffect, useRef } from 'react';
import { ViewStyle } from 'react-native';
import {
  AnimatedStyle,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { presets } from '../presets';
import { fireHaptic } from '../config/hapticsMap';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Add-to-cart feedback tuning (FR-011). */
export const addToCartFeedback = {
  /** Subtle confirmation pulse on the button/icon/quantity surface. */
  pulseScale: 1.05,
};

export interface AddToCartAnimation {
  /** Spread on the Animated.View wrapping the control that confirms. */
  pulseStyle: AnimatedStyle<ViewStyle>;
}

/**
 * Add-to-cart feedback recipe (feature 010 FR-011) — reacts only to
 * already-confirmed UI states. Pass a value that changes on confirmed
 * success (e.g. the server-confirmed cart count, or a success counter —
 * NOT a promise or in-flight flag). Contains zero cart, server-state, or
 * store-update logic; it pulses and haps, nothing more.
 */
export function useAddToCartFeedback(
  confirmedSuccess: number | string | boolean,
  options: { haptic?: boolean } = {},
): AddToCartAnimation {
  const { haptic = true } = options;
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const { duration, easing } = presets.fastInteraction(reducedMotion);
    scale.value = withSequence(
      withTiming(addToCartFeedback.pulseScale, { duration, easing }),
      withTiming(1, presets.springSnappy),
    );
    if (haptic) fireHaptic('addToCart', reducedMotion);
    return () => cancelAnimation(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmedSuccess]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { pulseStyle };
}
