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
  animationDuration?: number;
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
  gestureEnabled?: boolean;
  fullScreenGestureEnabled?: boolean;
}

export const screenTransitions = {
  /** Snappy cross-fade — direction-neutral surfaces (180ms). */
  fade: {
    animation: 'fade',
    animationDuration: 180,
  } as ScreenTransitionOptions,
  /**
   * Fast, snappy horizontal slide (~200ms, mirrored for RTL with gesture enabled).
   */
  horizontal: {
    animation: I18nManager.isRTL ? 'slide_from_left' : 'slide_from_right',
    // animation: Platform.OS === 'android' ? 'none' : 'slide_from_right',
    // animation: "default",
    animationDuration: 200,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  } as ScreenTransitionOptions,
  /** Snappy vertical slide — details, secondary surfaces (220ms). */
  vertical: {
    animation: 'slide_from_bottom',
    animationDuration: 220,
    gestureEnabled: true,
  } as ScreenTransitionOptions,
  /** Modal-like layered content — iOS formSheet, modal fallback elsewhere. */
  sheet: (Platform.OS === 'ios'
    ? { presentation: 'formSheet', animation: 'slide_from_bottom', animationDuration: 240, gestureEnabled: true }
    : { presentation: 'modal', animation: 'slide_from_bottom', animationDuration: 240, gestureEnabled: true }) as ScreenTransitionOptions,
} as const;

export type ScreenTransitionPreset = keyof typeof screenTransitions;
