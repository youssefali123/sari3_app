import { triggerLight, triggerMedium, triggerSuccess } from '../../utils/haptics';

/**
 * Haptic allow-list (feature 010 FR-020) — a static, auditable moment→
 * trigger map over the Phase 1 `utils/haptics.ts` wrapper. Routine presses,
 * scrolling, entrances, and decoration are excluded by rule; haptics never
 * carry meaning alone. Call sites invoke only `fireHaptic(moment, …)` —
 * direct `expo-haptics` calls for these moments are forbidden.
 */

export type HapticMoment =
  | 'addToCart'
  | 'favorite'
  | 'orderPlaced'
  | 'importantConfirmation'
  | 'significantStatus';

export const hapticPairings: Record<HapticMoment, () => void> = {
  addToCart: triggerMedium,
  favorite: triggerLight,
  orderPlaced: triggerSuccess,
  importantConfirmation: triggerMedium,
  significantStatus: triggerLight,
};

/**
 * Fires the paired haptic unless the user prefers reduced motion (the calm
 * rule turns haptic pairings off alongside movement — data-model §1.4).
 * Failures inside the wrapper are swallowed there.
 */
export function fireHaptic(moment: HapticMoment, reducedMotion: boolean): void {
  if (reducedMotion) return;
  hapticPairings[moment]();
}
