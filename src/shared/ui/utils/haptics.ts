import * as Haptics from 'expo-haptics';

/**
 * Thin haptics wrapper (feature 009 T016). Centralizes impact styles so
 * call sites stay semantic and the library can be swapped in one place.
 * No component integration in Phase 1 — call sites adopt these gradually.
 */
export function triggerLight(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function triggerMedium(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

export function triggerSuccess(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
}
