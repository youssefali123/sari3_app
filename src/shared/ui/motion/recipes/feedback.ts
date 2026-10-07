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
import { fireHaptic } from '../config/hapticsMap';
import { useReducedMotion } from '../hooks/useReducedMotion';

/** Outcome feedback tuning (FR-019): supporting only, never the message. */
export const outcomeFeedback = {
  /** Subtle rise-in scale for the outcome surface. */
  fromScale: 0.97,
};

export type OutcomeKind = 'success' | 'error';

export interface OutcomeFeedbackAnimation {
  /** Spread on the Animated.View holding the outcome message surface. */
  feedbackStyle: AnimatedStyle<ViewStyle>;
}

/**
 * Success/error supporting motion (feature 010 FR-019) — a restrained
 * settle that plays when an outcome message appears. Text, icon, and
 * semantic color still carry the meaning; motion only supports. `trigger`
 * is the confirmed outcome event (counter/id) — NOT the raw message.
 */
export function useOutcomeFeedback(
  kind: OutcomeKind,
  trigger: number | string,
  options: { haptic?: boolean } = {},
): OutcomeFeedbackAnimation {
  const { haptic = false } = options;
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const { duration, easing } = presets.normalInteraction(reducedMotion);
    progress.value = 0;
    progress.value = withTiming(1, { duration, easing });
    if (haptic && kind === 'success') {
      fireHaptic('importantConfirmation', reducedMotion);
    }
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, trigger, reducedMotion]);

  const feedbackStyle = useAnimatedStyle(() => {
    const remaining = 1 - progress.value;
    return {
      opacity: progress.value,
      transform: [
        { translateY: remaining * 8 },
        { scale: 1 - remaining * (1 - outcomeFeedback.fromScale) },
      ],
    };
  });

  return { feedbackStyle };
}
