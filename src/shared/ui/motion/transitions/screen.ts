import { I18nManager, Platform } from 'react-native';
import type { StackAnimationTypes } from 'react-native-screens';

/**
 * Screen transition presets (feature 010 FR-008/FR-009) — Expo Router /
 * native-stack `screenOptions` mappings only. Nothing here wraps or replaces
 * the Router (no custom navigator, FR-008). Directional presets resolve
 * through `I18nManager.isRTL` so forward navigation mirrors correctly in
 * Arabic (FR-009).
 */

export interface ScreenTransitionOptions {
  animation?: StackAnimationTypes;
  /** Presentation union accepted by native-stack `screenOptions`. */
  presentation?:
    | 'card'
    | 'modal'
    | 'transparentModal'
    | 'containedModal'
    | 'containedTransparentModal'
    | 'fullScreenModal'
    | 'formSheet'
    | 'pageSheet';
}

export const screenTransitions = {
  /** Cross-fade — direction-neutral surfaces. */
  fade: { animation: 'fade' } as ScreenTransitionOptions,
  /** Subtle horizontal slide — mirrored automatically under RTL (FR-009). */
  horizontal: {
    animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
  } as ScreenTransitionOptions,
  /** Subtle vertical slide — details, secondary surfaces. */
  vertical: { animation: 'slide_from_bottom' } as ScreenTransitionOptions,
  /** Modal-like layered content — iOS formSheet, modal fallback elsewhere. */
  sheet: (Platform.OS === 'ios'
    ? { presentation: 'formSheet', animation: 'slide_from_bottom' }
    : { presentation: 'modal', animation: 'slide_from_bottom' }) as ScreenTransitionOptions,
} as const;

export type ScreenTransitionPreset = keyof typeof screenTransitions;
