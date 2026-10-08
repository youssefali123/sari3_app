import { useEffect } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';
import {
  Easing,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * Custom hook to smoothly elevate bottom sheets when the software keyboard appears.
 * Uses Reanimated's native hardware keyboard tracking (60/120fps worklets),
 * with a synchronized fallback listener to ensure butter-smooth elevation across all devices.
 */
export function useSmoothKeyboardElevation() {
  const animatedKeyboard = useAnimatedKeyboard({
    isStatusBarTranslucentAndroid: true,
  });
  const fallbackHeight = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e: KeyboardEvent) => {
      if (animatedKeyboard.height.value > 0) return;
      const duration = e.duration > 0 ? e.duration : 250;
      fallbackHeight.value = withTiming(e.endCoordinates.height, {
        duration,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
      });
    };

    const onHide = (e: KeyboardEvent) => {
      if (animatedKeyboard.height.value === 0) {
        const duration = e.duration > 0 ? e.duration : 250;
        fallbackHeight.value = withTiming(0, {
          duration,
          easing: Easing.bezier(0.33, 1, 0.68, 1),
        });
      }
    };

    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [animatedKeyboard]);

  const animatedStyle = useAnimatedStyle(() => {
    const height = Math.max(animatedKeyboard.height.value, fallbackHeight.value);
    return {
      transform: [{ translateY: -height }],
    };
  });

  return animatedStyle;
}
