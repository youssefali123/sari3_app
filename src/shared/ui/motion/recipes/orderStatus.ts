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

/**
 * Order-status transition patterns (feature 010 FR-017/FR-018) — one
 * descriptor per confirmed server status. The descriptor says WHAT the
 * indicator does; colors and labels stay with the consuming screen/theme
 * (the motion layer carries no business meaning beyond the pattern).
 * Call sites MUST pass server-confirmed statuses only — an unconfirmed
 * change must never be fed here (FR-018).
 */

export type ConfirmedOrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type StatusPattern =
  | 'indicator'      // passive dot/state marker (pending, accepted)
  | 'progress'       // forward movement (preparing, out_for_delivery)
  | 'checkmark'      // terminal success pop (delivered)
  | 'icon';          // neutral terminal icon change (cancelled)

export interface StatusTransitionDescriptor {
  pattern: StatusPattern;
  /** Major state arrival — pairs with the `significantStatus` haptic. */
  significant: boolean;
}

const STATUS_PATTERNS: Record<
  ConfirmedOrderStatus,
  StatusTransitionDescriptor
> = {
  pending:         { pattern: 'indicator',  significant: false },
  accepted:        { pattern: 'indicator',  significant: true },
  preparing:       { pattern: 'progress',   significant: false },
  out_for_delivery:{ pattern: 'progress',   significant: true },
  delivered:       { pattern: 'checkmark',  significant: true },
  cancelled:       { pattern: 'icon',       significant: true },
};

/**
 * Pure mapping — confirmed status → transition descriptor (FR-017). No
 * animation is triggered here; feed the descriptor to
 * `useOrderStatusTransition` for the indicator motion.
 */
export function orderStatusTransition(
  status: ConfirmedOrderStatus,
): StatusTransitionDescriptor {
  return STATUS_PATTERNS[status];
}

/** Indicator pop tuning — restrained, never flashing (FR-018). */
export const orderStatusMotion = {
  popScale: 1.08,
};

export interface OrderStatusAnimation {
  /** Spread on the Animated.View wrapping the status indicator/icon. */
  indicatorStyle: AnimatedStyle<ViewStyle>;
  descriptor: StatusTransitionDescriptor;
}

/**
 * Confirmed-state indicator transition (FR-018) — animates ONLY when the
 * passed status is server-confirmed; the caller owns that guarantee. Rapid
 * changes supersede in-flight animation (no backlog). No aggressive
 * flashing: a single subtle pop, not a repeat loop.
 */
export function useOrderStatusTransition(
  status: ConfirmedOrderStatus,
  options: { haptic?: boolean } = {},
): OrderStatusAnimation {
  const { haptic = true } = options;
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const firstRender = useRef(true);
  const descriptor = orderStatusTransition(status);

  useEffect(() => {
    // Displaying the initial status is not a status CHANGE (FR-018).
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const { duration, easing } = presets.normalInteraction(reducedMotion);
    scale.value = withSequence(
      withTiming(orderStatusMotion.popScale, { duration, easing }),
      withTiming(1, presets.springSnappy),
    );
    if (descriptor.significant && haptic) {
      fireHaptic('significantStatus', reducedMotion);
    }
    return () => cancelAnimation(scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reducedMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { indicatorStyle, descriptor };
}
