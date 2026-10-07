import { AccessibilityInfo } from 'react-native';
import { motion } from '../theme/motion';

/**
 * Returns whether the user prefers reduced motion (feature 009 US6 T044).
 * Animation recipes MUST respect this via `safeMotionDuration`.
 * Note: `AccessibilityInfo.isReducedMotionEnabled` is promise-based — callers
 * that need the value synchronously should cache the result at app startup.
 */
export async function prefersReducedMotion(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

/**
 * Returns 0 when the user prefers reduced motion, otherwise the given
 * duration token. Phase 2 animation recipes MUST wrap durations with this.
 */
export function safeMotionDuration(token: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : token;
}

/** Convenience: all motion tokens adjusted for reduced-motion preference. */
export function motionFor(reducedMotion: boolean) {
  if (reducedMotion) {
    return { ...motion, durationFast: 0, durationNormal: 0, durationSlow: 0 };
  }
  return { ...motion };
}
