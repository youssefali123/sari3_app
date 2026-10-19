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
  options: { haptic?: boolean; enabled?: boolean } = {},
): FavoriteToggleAnimation {
  const { haptic = true, enabled = true } = options;
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const prevFavorite = useRef(isFavorite);
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Initial mount is purely a display state, not a user toggle event
    if (isFirstMount.current) {
      isFirstMount.current = false;
      prevFavorite.current = isFavorite;
      return;
    }

    // When not enabled (e.g. initial query fetch / cache hydration), sync value without animating or vibrating
    if (!enabled) {
      prevFavorite.current = isFavorite;
      return;
    }

    // Only animate on actual state changes
    if (prevFavorite.current === isFavorite) {
      return;
    }
    prevFavorite.current = isFavorite;

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
  }, [isFavorite, enabled]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { iconStyle };
}
