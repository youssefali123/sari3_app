import { useEffect } from 'react';
import { I18nManager, ViewStyle } from 'react-native';
import {
  AnimatedStyle,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { presets } from '../presets';
import { useReducedMotion } from './useReducedMotion';

/** Axis the item travels in from. `vertical` is RTL-neutral by default. */
export type EntranceDirection = 'vertical' | 'horizontal';

export interface EntranceConfig {
  /** Ms between successive items before the stagger cap kicks in. */
  delayStep: number;
  /** Index cap on stagger — item N uses delay `min(N, cap) * delayStep`. */
  staggerCap: number;
  /** Travel distance in px before settling (RTL-mirrored when horizontal). */
  distance: number;
  /** Travel axis; horizontal is mirrored under RTL automatically. */
  direction: EntranceDirection;
  /** Optional extra scale from → 1. */
  fromScale?: number;
}

export interface EntranceOptions extends Partial<EntranceConfig> {
  /**
   * Stable item identity. Guards against re-playing the entrance when a
   * virtualized list recycles the cell for a different item.
   */
  itemKey?: string | number;
}

/** Default entrance language shared by every opted-in list (FR-006). */
export const defaultEntranceConfig: EntranceConfig = {
  delayStep: 30,
  staggerCap: 8,
  distance: 16,
  direction: 'vertical',
};

// Keeps already-played item keys so recycled cells don't re-fade on scroll.
// FIFO-capped to stay bounded on very long browsing sessions.
const playedEntranceKeys = new Set<string>();
const MAX_PLAYED_KEYS = 1000;
const playedKeyOrder: string[] = [];

function markPlayed(key: string): boolean {
  if (playedEntranceKeys.has(key)) return false;
  playedEntranceKeys.add(key);
  playedKeyOrder.push(key);
  if (playedKeyOrder.length > MAX_PLAYED_KEYS) {
    const evicted = playedKeyOrder.shift();
    if (evicted !== undefined) playedEntranceKeys.delete(evicted);
  }
  return true;
}

/**
 * Cell entrance driver (feature 010 FR-006/FR-007) — opacity 0→1 with a
 * subtle translation and optional scale, delayed by a capped index stagger
 * (`min(index, cap) * delayStep`, so a 1000-item list costs the same as a
 * 9-item one). Strictly opt-in: lists that don't call this render exactly
 * as before. Run inside the item wrapper component, never on the list.
 */
export function useEntranceAnimation(
  index: number,
  options: EntranceOptions = {},
): AnimatedStyle<ViewStyle> {
  const config = { ...defaultEntranceConfig, ...options };
  const { delayStep, staggerCap, distance, direction, fromScale, itemKey } = config;
  const reducedMotion = useReducedMotion();

  const progress = useSharedValue(0);

  useEffect(() => {
    // Recycled cell for an already-played item: show the final state.
    const firstPlay =
      itemKey === undefined || markPlayed(String(itemKey));
    if (!firstPlay) {
      progress.value = 1;
      return;
    }

    if (reducedMotion) {
      // Calm equivalent: no travel, instant reveal (opacity/state only).
      progress.value = 1;
      return;
    }

    const { duration, easing } = presets.gentleEntrance(false);
    const delay = Math.min(index, staggerCap) * delayStep;
    progress.value = withDelay(delay, withTiming(1, { duration, easing }));
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey, index]);

  const horizontalSign = I18nManager.isRTL ? -1 : 1;

  const animatedStyle = useAnimatedStyle(() => {
    const remaining = 1 - progress.value;
    const translate =
      direction === 'horizontal'
        ? { translateX: -remaining * distance * horizontalSign }
        : { translateY: remaining * distance };
    const transform =
      fromScale === undefined
        ? [translate]
        : [translate, { scale: 1 - remaining * (1 - fromScale) }];
    return {
      opacity: progress.value,
      transform,
    };
  });

  return animatedStyle;
}
