import {
  Easing,
  EasingFunction,
  EasingFunctionFactory,
  ReduceMotion,
  WithSpringConfig,
} from 'react-native-reanimated';
import { motion } from '../theme/motion';
import { safeMotionDuration } from '../utils/motion';

/**
 * Semantic motion presets (feature 010 FR-002) — the single source of truth
 * for how motion *feels*. Built additively over the Phase 1 `theme/motion.ts`
 * tokens; Phase 1 values are never edited. Feature screens MUST consume
 * presets (directly or through recipes) and MUST NOT hardcode animation
 * constants for covered interactions (FR-002, SC-003).
 *
 * Every timing preset resolves its duration through `safeMotionDuration()`,
 * so reduced motion collapses to zero duration; spring presets additionally
 * rely on Reanimated's `ReduceMotion.System` default to jump to the final
 * value when the OS setting is on.
 */

export interface TimingPreset {
  /** Duration in ms (0 under reduced motion). */
  duration: number;
  easing: EasingFunction | EasingFunctionFactory;
}

export interface MotionPresets {
  /** Presses, ticks, small toggles (150ms / standard). */
  fastInteraction(reducedMotion: boolean): TimingPreset;
  /** Entrances, sheet settles, dialog surfaces (250ms / standard). */
  normalInteraction(reducedMotion: boolean): TimingPreset;
  /** Hero/status transitions deserving weight (400ms / emphasized). */
  emphasizedInteraction(reducedMotion: boolean): TimingPreset;
  /** List/item arrivals (250ms / decelerated). */
  gentleEntrance(reducedMotion: boolean): TimingPreset;
  /** Finger-following motion (stiff, slightly under-damped). */
  springInteractive: WithSpringConfig;
  /** Quick settles — snaps, releases (high-stiffness, near-critical). */
  springSnappy: WithSpringConfig;
}

/** Parses a `cubic-bezier(x1, y1, x2, y2)` token into a Reanimated easing. */
function bezierFromToken(token: string): EasingFunction | EasingFunctionFactory {
  const match = /cubic-bezier\(([^)]+)\)/.exec(token);
  if (!match) {
    return Easing.inOut(Easing.quad);
  }
  const [x1, y1, x2, y2] = match[1].split(',').map((part) => Number(part.trim()));
  return Easing.bezierFn(x1, y1, x2, y2);
}

function timingPreset(
  durationMs: number,
  easingToken: string,
  reducedMotion: boolean,
): TimingPreset {
  return {
    duration: safeMotionDuration(durationMs, reducedMotion),
    easing: bezierFromToken(easingToken),
  };
}

export const presets: MotionPresets = {
  fastInteraction: (reducedMotion) =>
    timingPreset(motion.durationFast, motion.easingStandard, reducedMotion),
  normalInteraction: (reducedMotion) =>
    timingPreset(motion.durationNormal, motion.easingStandard, reducedMotion),
  emphasizedInteraction: (reducedMotion) =>
    timingPreset(motion.durationSlow, motion.easingEmphasized, reducedMotion),
  gentleEntrance: (reducedMotion) =>
    timingPreset(motion.durationNormal, motion.easingDecelerated, reducedMotion),
  springInteractive: {
    ...motion.springInteractive,
    // Declared explicitly so reduced-motion behavior is part of the preset
    // contract, not implicit.
    reduceMotion: ReduceMotion.System,
  },
  springSnappy: {
    ...motion.springSnappy,
    reduceMotion: ReduceMotion.System,
  },
};
