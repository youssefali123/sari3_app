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

/** Favorite pop tuning (FR-010): immediate, subtle, optional emphasis. */
export const favoriteToggle = {
  /** Peak scale of the pop when the favorite is confirmed on. */
  popScale: 1.2,
  /** Peak scale of the settle pulse when favorited off. */
  offPulseScale: 0.92,
};

export interface FavoriteToggleAnimation {
  /** Spread on the Animated.View wrapping the favorite icon. */
  iconStyle: AnimatedStyle<ViewStyle>;
}

/**
 * Favorite toggle recipe (feature 010 FR-010) — reacts to the
 * *already-confirmed* favorite state only. Shared by favorite stores and
 * products; independent of favorite business logic (no fetches, no writes —
 * the haptic fires here, the state change never originates here).
 */
export function useFavoriteToggleAnimation(
  isFavorite: boolean,
  options: { haptic?: boolean } = {},
): FavoriteToggleAnimation {
  const { haptic = true } = options;
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    // The initial favorite state is a display fact, not a toggle event —
    // pop + haptic only on confirmed CHANGES (FR-010 reacts to states).
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const { duration, easing } = presets.fastInteraction(reducedMotion);
    if (isFavorite) {
      scale.value = withSequence(
        withTiming(favoriteToggle.popScale, { duration, easing }),
        withTiming(1, presets.springSnappy),
      );
    } else {
      scale.value = withSequence(
        withTiming(favoriteToggle.offPulseScale, { duration, easing }),
        withTiming(1, presets.springSnappy),
      );
    }
    if (haptic) fireHaptic('favorite', reducedMotion);
    return () => cancelAnimation(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFavorite]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { iconStyle };
}
