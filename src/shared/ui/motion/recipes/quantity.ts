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
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Quantity tick tuning (FR-012): immediate, subtle, no excess movement. */
export const quantityTick = {
  /** Peak scale of the value tick on each confirmed change. */
  tickScale: 1.15,
};

export interface QuantityTickAnimation {
  /** Spread on the Animated.View/Animated.Text showing the quantity. */
  tickStyle: AnimatedStyle<ViewStyle>;
}

/**
 * Quantity control recipe (feature 010 FR-012) — a subtle immediate tick on
 * every *confirmed* quantity change. Rapid taps supersede cleanly: each new
 * change replaces the in-flight sequence rather than queueing a backlog.
 * Consumed by the shared `QuantitySelector` (in place).
 */
export function useQuantityTick(quantity: number): QuantityTickAnimation {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    // The initial quantity is a display fact, not a change event.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const { duration, easing } = presets.fastInteraction(reducedMotion);
    scale.value = withSequence(
      withTiming(quantityTick.tickScale, { duration, easing }),
      withTiming(1, presets.springSnappy),
    );
    return () => cancelAnimation(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, reducedMotion]);

  const tickStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { tickStyle };
}
