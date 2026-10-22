/* eslint-disable react-hooks/immutability */
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors, useTheme } from '../theme';
import { useSmoothKeyboardElevation } from '../motion';
import { Icon } from './Icon';

export interface SwipeableBottomSheetModalProps {
  /** Visibility state of the modal */
  visible: boolean;
  /** Callback invoked when the modal is dismissed */
  onClose: () => void;
  /** Content rendered inside the sheet */
  children: React.ReactNode;
  /** Optional title for the default header */
  title?: string;
  /** Optional subtitle for the default header */
  subtitle?: string;
  /** Optional custom header to render inside the gesture-enabled top area */
  header?: React.ReactNode;
  /** Optional element rendered on the opposite side of the close button */
  headerRight?: React.ReactNode;
  /** Whether to show the top handle indicator (default: true) */
  showHandle?: boolean;
  /** Whether to show a close (X) button in the header */
  showCloseButton?: boolean;
  /** Maximum height constraint for the sheet (default: '85%') */
  maxHeight?: number | `${number}%`;
  /** Optional minimum height constraint for the sheet */
  minHeight?: number | `${number}%`;
  /** Custom style for the sheet container */
  style?: StyleProp<ViewStyle>;
  /** Custom style for the inner content container */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Whether the entire sheet body captures the pan gesture (default: true) */
  enableContentPan?: boolean;
  /** Automatically elevate above the software keyboard (default: true) */
  avoidKeyboard?: boolean;
  testID?: string;
}

const dismissKeyboard = () => {
  Keyboard.dismiss();
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 75;
const DISMISS_VELOCITY = 500;

/**
 * Premium, swipeable Bottom Sheet Modal component.
 * Uses GestureHandlerRootView inside native Modal to guarantee full Android
 * and iOS gesture recognition at 120 FPS on the UI thread (worklets).
 * Supports downward swipe-to-dismiss, tactile haptic feedback,
 * dynamic backdrop fade, and software keyboard elevation.
 */
export function SwipeableBottomSheetModal({
  visible,
  onClose,
  children,
  title,
  subtitle,
  header,
  headerRight,
  showHandle = true,
  showCloseButton,
  maxHeight = '85%',
  minHeight,
  style,
  contentContainerStyle,
  enableContentPan = true,
  avoidKeyboard = true,
  testID,
}: SwipeableBottomSheetModalProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardElevationStyle = useSmoothKeyboardElevation();

  const translateY = useSharedValue(0);
  const isClosing = useSharedValue(false);

  const triggerHaptic = useCallback(() => {
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Optional on unsupported devices
    }
  }, []);

  const jsHandleDismiss = useCallback(() => {
    Keyboard.dismiss();
    if (isClosing.value) return;
    isClosing.value = true;
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, () => {
      runOnJS(onClose)();
    });
  }, [isClosing, onClose, translateY]);

  // Primary gesture for the top grab zone (handle + header)
  const grabGesture = Gesture.Pan()
    .activeOffsetY(3)
    .failOffsetX([-35, 35])
    .onStart(() => {
      'worklet';
      runOnJS(dismissKeyboard)();
    })
    .onUpdate((e) => {
      'worklet';
      if (isClosing.value) return;
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      } else {
        // Subtle resistance when pulling upwards
        translateY.value = e.translationY * 0.15;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (isClosing.value) return;
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY) {
        isClosing.value = true;
        runOnJS(triggerHaptic)();
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 260 });
      }
    });

  // Secondary gesture for the sheet surface outside the header
  const contentGesture = Gesture.Pan()
    .enabled(enableContentPan)
    .activeOffsetY(12)
    .failOffsetY(-8)
    .onStart(() => {
      'worklet';
      runOnJS(dismissKeyboard)();
    })
    .onUpdate((e) => {
      'worklet';
      if (isClosing.value) return;
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      'worklet';
      if (isClosing.value) return;
      if (e.translationY > DISMISS_THRESHOLD || e.velocityY > DISMISS_VELOCITY) {
        isClosing.value = true;
        runOnJS(triggerHaptic)();
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 180 }, () => {
          runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 260 });
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [0, 240],
      [1, 0.25],
      'clamp',
    );
    return {
      opacity,
    };
  });

  const resolvedMaxHeight = useMemo(() => {
    if (typeof maxHeight === 'number') return maxHeight;
    if (typeof maxHeight === 'string' && maxHeight.endsWith('%')) {
      const pct = parseFloat(maxHeight) / 100;
      return SCREEN_HEIGHT * (isNaN(pct) ? 0.85 : pct);
    }
    return SCREEN_HEIGHT * 0.85;
  }, [maxHeight]);

  const resolvedMinHeight = useMemo(() => {
    if (typeof minHeight === 'number') return minHeight;
    if (typeof minHeight === 'string' && minHeight.endsWith('%')) {
      const pct = parseFloat(minHeight) / 100;
      return SCREEN_HEIGHT * (isNaN(pct) ? 0 : pct);
    }
    return undefined;
  }, [minHeight]);

  const resolvedShowClose = showCloseButton ?? (!header && Boolean(title));

  const renderHeader = () => {
    if (header) {
      return header;
    }
    if (!title && !subtitle && !resolvedShowClose && !headerRight) {
      return null;
    }

    return (
      <View style={styles.header}>
        {resolvedShowClose ? (
          <Pressable
            onPress={jsHandleDismiss}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="إغلاق"
            style={styles.closeBtn}
          >
            <Icon name="X" size={20} color={colors.mutedForeground} />
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}

        <View style={styles.titleWrap}>
          {title ? (
            <Text
              style={[
                styles.title,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.headingSmall.fontFamily,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {headerRight ? (
          <View style={styles.headerRightWrap}>{headerRight}</View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>
    );
  };

  // Reset translateY and isClosing when modal opens, and provide smooth entrance spring
  useEffect(() => {
    if (visible) {
      isClosing.value = false;
      translateY.value = 300;
      translateY.value = withSpring(0, {
        damping: 26,
        stiffness: 280,
        mass: 0.9,
      });
    } else {
      isClosing.value = false;
      translateY.value = 0;
    }
  }, [visible, isClosing, translateY]);

  const sheetBody = (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          maxHeight: resolvedMaxHeight,
          minHeight: resolvedMinHeight,
          paddingBottom: Math.max(insets.bottom + 20, 32),
        },
        animatedSheetStyle,
        style,
      ]}
    >
      <GestureDetector gesture={grabGesture}>
        <View style={styles.grabArea}>
          {showHandle ? (
            <View style={styles.handleWrapper}>
              <View
                style={[
                  styles.handleIndicator,
                  {
                    backgroundColor: colors.mutedForeground,
                    opacity: 0.35,
                  },
                ]}
              />
            </View>
          ) : null}
          {renderHeader()}
        </View>
      </GestureDetector>

      <View style={[styles.content, contentContainerStyle]}>{children}</View>
    </Animated.View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={jsHandleDismiss}
      testID={testID}
    >
      <GestureHandlerRootView style={styles.modalRoot}>
        {/* Backdrop scrim (tap to dismiss, with dynamic drag-fade) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.backdrop,
            animatedBackdropStyle,
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={jsHandleDismiss}
            accessibilityRole="none"
            accessibilityLabel="إغلاق"
          />
        </Animated.View>

        {/* Outer elevation container for software keyboard elevation */}
        <Animated.View
          style={[
            styles.elevationContainer,
            avoidKeyboard ? keyboardElevationStyle : undefined,
          ]}
        >
          {/* Sheet surface driven by native animated translateY */}
          {enableContentPan ? (
            <GestureDetector gesture={contentGesture}>{sheetBody}</GestureDetector>
          ) : (
            sheetBody
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  elevationContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  grabArea: {
    width: '100%',
    paddingBottom: 4,
  },
  handleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  handleIndicator: {
    width: 48,
    height: 5,
    borderRadius: 999,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    marginBottom: 8,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  headerSpacer: {
    width: 32,
    height: 32,
  },
  headerRightWrap: {
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  content: {
    flexShrink: 1,
  },
});
