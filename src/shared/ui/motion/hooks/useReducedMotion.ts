import { useReducedMotion as useReanimatedReducedMotion } from 'react-native-reanimated';

/**
 * Live OS reduced-motion preference (feature 010 FR-021, data-model §1.4).
 * Delegates to Reanimated's built-in hook, which reads the OS accessibility
 * setting and follows mid-session toggles without any app-level caching,
 * in-app toggle, or persistence. The OS is the only source of truth.
 */
export function useReducedMotion(): boolean {
  return useReanimatedReducedMotion();
}
