import { motion } from '../../theme/motion';

/**
 * Shared bottom-sheet animation configuration (feature 010 FR-013) — one
 * `animationConfigs` object consumed by `Sari3BottomSheet` via prop
 * passthrough. Spring-based, snappy preset (near-critically damped).
 * Drag physics remain 100% @gorhom/bottom-sheet; this config owns only
 * open/close/snap timing so every sheet in the app feels identical.
 * (Reanimated's default `ReduceMotion.System` still applies to the spring.)
 */
export const bottomSheetAnimationConfigs = {
  damping: motion.springSnappy.damping,
  stiffness: motion.springSnappy.stiffness,
  mass: motion.springSnappy.mass,
};
