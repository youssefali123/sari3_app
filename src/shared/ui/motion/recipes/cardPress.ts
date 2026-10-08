import { PressAnimationOptions } from '../hooks/usePressAnimation';

/**
 * Opt-in card press recipe (feature 010 FR-005) — gentler than the button
 * press (~0.99), no layout shift, transform-only. Cards that don't opt in
 * never animate; non-interactive cards MUST NOT use this recipe.
 */
export const cardPress: Required<Pick<PressAnimationOptions, 'pressedScale'>> = {
  pressedScale: 0.98,
};
