import React, { useCallback } from 'react';
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export interface TabBarButtonProps {
  children?: React.ReactNode;
  onPress?: ((e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent) => void) | null;
  onLongPress?: ((e: GestureResponderEvent) => void) | null;
  accessibilityState?: { selected?: boolean };
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  [key: string]: any;
}

/**
 * High-performance, tactile TabBarButton with 0-delay touch feedback,
 * light haptic vibration, and snappy Reanimated spring bounce.
 */
export function TabBarButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  style,
}: TabBarButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    // Instant tactile compression on touch down (Frame 0)
    scale.value = withTiming(0.91, { duration: 60 });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    // Snappy spring rebound on release
    scale.value = withSpring(1, { damping: 14, stiffness: 380 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress ?? undefined}
      onLongPress={onLongPress ?? undefined}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      unstable_pressDelay={0}
      hitSlop={{ top: 8, left: 6, right: 6, bottom: 0 }}
      style={[styles.container, style]}
    >
      <Animated.View style={[styles.content, animatedStyle]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
