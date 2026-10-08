import { PressAnimationOptions } from '../hooks/usePressAnimation';

/**
 * Button press recipe (feature 010 FR-003/FR-004) — one shared compression
 * response for all six Button variants. Consumed via `usePressAnimation`
 * inside `Button`; there is deliberately no separate AnimatedButton.
 * Disabled/loading branches are handled by the driver's structural
 * short-circuit, not by callers.
 */
export const buttonPress: Required<Pick<PressAnimationOptions, 'pressedScale'>> = {
  pressedScale: 0.95,
};
