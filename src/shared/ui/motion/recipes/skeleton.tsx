import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  AnimatedStyle,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { Theme } from '../../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

/**
 * Skeleton primitives (feature 010 FR-015) — six themed shapes driven by ONE
 * shared opacity-pulse hook (~1200ms repeat). No gradient library, no
 * shimmer sweep; opacity pulses are the cheapest animation (transform/
 * opacity only, FR-022). Under reduced motion the hook returns the static
 * shape (calm rule). No gradient library is used (FR-025).
 */

/** Skeleton pulse tuning. */
export const SkeletonShapesConfig = {
  /** One full pulse (dim → base → dim) in ms. */
  pulseDurationMs: 1200,
  /** Low opacity of the pulse. */
  minOpacity: 0.55,
};

/** Shared skeleton pulse — one language for all six shapes (FR-015). */
export function useSkeletonAnimation(): AnimatedStyle<ViewStyle> | undefined {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withRepeat(
      withSequence(
        withTiming(SkeletonShapesConfig.minOpacity, {
          duration: SkeletonShapesConfig.pulseDurationMs / 2,
        }),
        withTiming(1, { duration: SkeletonShapesConfig.pulseDurationMs / 2 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(opacity);
  }, [reducedMotion, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return reducedMotion ? undefined : pulseStyle;
}

function SkeletonShape({
  style,
  testID,
}: {
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { theme } = useTheme();
  const pulseStyle = useSkeletonAnimation();
  return (
    <Animated.View
      testID={testID}
      style={[
        shapeStyles(theme).base,
        pulseStyle,
        style,
      ]}
    />
  );
}

/** Text-line placeholder. Pass width/height via style. */
export function SkeletonText(props: { style?: StyleProp<ViewStyle>; testID?: string }) {
  return <SkeletonShape {...props} />;
}

/** Image/media placeholder (square-ish by default). */
export function SkeletonImage(props: { style?: StyleProp<ViewStyle>; testID?: string }) {
  return <SkeletonShape {...props} />;
}

/** Generic card placeholder. */
export function SkeletonCard(props: { style?: StyleProp<ViewStyle>; testID?: string }) {
  return <SkeletonShape {...props} />;
}

/** Horizontal list-item placeholder (thumb + two text lines). */
export function SkeletonItem(props: { style?: StyleProp<ViewStyle>; testID?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[itemStyles(theme).row, props.style]}>
      <SkeletonImage style={itemStyles(theme).thumb} testID={props.testID ? `${props.testID}-thumb` : undefined} />
      <View style={itemStyles(theme).lines}>
        <SkeletonText style={itemStyles(theme).linePrimary} />
        <SkeletonText style={itemStyles(theme).lineSecondary} />
      </View>
    </View>
  );
}

/** Product-card placeholder (image + title + price lines). */
export function SkeletonProductCard(props: { style?: StyleProp<ViewStyle>; testID?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[cardStyles(theme).card, props.style]}>
      <SkeletonImage style={cardStyles(theme).image} />
      <SkeletonText style={cardStyles(theme).titleLine} />
      <SkeletonText style={cardStyles(theme).priceLine} />
    </View>
  );
}

/** Store-card placeholder (wide image + name + meta lines). */
export function SkeletonStoreCard(props: { style?: StyleProp<ViewStyle>; testID?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[cardStyles(theme).card, props.style]}>
      <SkeletonImage style={cardStyles(theme).wideImage} />
      <SkeletonText style={cardStyles(theme).titleLine} />
      <SkeletonText style={cardStyles(theme).metaLine} />
    </View>
  );
}

/** All six shapes, grouped for consumers and the gallery (SC-009). */
export const SkeletonShapes = {
  Text: SkeletonText,
  Image: SkeletonImage,
  Card: SkeletonCard,
  Item: SkeletonItem,
  ProductCard: SkeletonProductCard,
  StoreCard: SkeletonStoreCard,
};

const shapeStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      backgroundColor: theme.colors.disabled,
      borderRadius: theme.radii.medium,
    },
  });

const itemStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    thumb: {
      width: 56,
      height: 56,
    },
    lines: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    linePrimary: {
      height: 14,
      width: '70%',
    },
    lineSecondary: {
      height: 12,
      width: '45%',
    },
  });

const cardStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.large,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    image: {
      height: 96,
      borderRadius: theme.radii.medium,
    },
    wideImage: {
      height: 128,
      borderRadius: theme.radii.medium,
    },
    titleLine: {
      height: 14,
      width: '60%',
    },
    priceLine: {
      height: 16,
      width: '35%',
    },
    metaLine: {
      height: 12,
      width: '80%',
    },
  });
