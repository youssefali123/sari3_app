import { useEffect } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';
import {
  Easing,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface UseSmoothKeyboardElevationOptions {
  /**
   * Proportion of keyboard height to translate by (0 to 1).
   * Default: 1 (translates by full height, suitable for bottom sheets).
   */
  factor?: number;
  /**
   * Maximum upward translation in pixels.
   * Useful for full-screen form pages (like login/register) to prevent pushing top headers off-screen.
   */
  maxOffset?: number;
  /**
   * Extra offset added to the translation.
   * Default: 0.
   */
  extraOffset?: number;
}

/**
 * Custom hook to smoothly elevate bottom sheets and screens when the software keyboard appears.
 * Uses Reanimated's native hardware keyboard tracking (60/120fps worklets),
 * with a synchronized fallback listener to ensure butter-smooth elevation across all devices.
 */
export function useSmoothKeyboardElevation(options?: UseSmoothKeyboardElevationOptions) {
  const animatedKeyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
  });
  const fallbackHeight = useSharedValue(0);
  const isKeyboardOpen = useSharedValue(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      isKeyboardOpen.value = true;
      const targetHeight = e.endCoordinates.height;
      const duration = e.duration > 0 ? e.duration : 250;
      fallbackHeight.value = withTiming(targetHeight, {
        duration,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
      });
    };

    const onHide = (e: KeyboardEvent) => {
      isKeyboardOpen.value = false;
      const duration = e.duration > 0 ? e.duration : 250;
      fallbackHeight.value = withTiming(0, {
        duration,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
      });
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    let rawHeight = 0;
    if (isKeyboardOpen.value) {
      rawHeight = Math.max(animatedKeyboard.height.value, fallbackHeight.value);
    } else {
      rawHeight = fallbackHeight.value;
    }

    const factor = options?.factor ?? 1;
    let offset = rawHeight * factor + (options?.extraOffset ?? 0);
    if (options?.maxOffset !== undefined) {
      offset = Math.min(offset, options.maxOffset);
    }
    return {
      transform: [{ translateY: -offset }],
    };
  });

  return animatedStyle;
}
