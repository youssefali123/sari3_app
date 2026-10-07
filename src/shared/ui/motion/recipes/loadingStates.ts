import { useEffect, useRef } from 'react';
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

export type LoadingPhase = 'idle' | 'loading' | 'success' | 'error';

/** Loading-state transition tuning (FR-016): subtle, opt-in, calm. */
export const loadingTransition = {
  /** Each phase change fades the content in from this opacity. */
  fromOpacity: 0.35,
};

export interface LoadingStateTransition {
  /** Spread on the Animated.View showing the phase content. */
  transitionStyle: AnimatedStyle<ViewStyle>;
}

/**
 * Loading-state transitions (feature 010 FR-016) — opt-in idle/loading/
 * success/error crossfade: each confirmed phase change fades the content in
 * from `loadingTransition.fromOpacity` to 1. Loading states never animate by
 * default — a screen only gets this motion by explicitly calling the hook,
 * so untouched surfaces render exactly as before (FR-028).
 */
export function useLoadingStateTransition(
  phase: LoadingPhase,
): LoadingStateTransition {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const { duration, easing } = presets.normalInteraction(reducedMotion);
    opacity.value = loadingTransition.fromOpacity;
    opacity.value = withTiming(1, { duration, easing });
    return () => cancelAnimation(opacity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reducedMotion]);

  const transitionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { transitionStyle };
}
