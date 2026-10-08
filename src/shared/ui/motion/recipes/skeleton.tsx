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
 * Skeleton primitives (feature 010 FR-015) — themed shapes driven by ONE
 * shared opacity-pulse hook (~1200ms repeat). No gradient library, no
 * shimmer sweep; opacity pulses are the cheapest animation (transform/
 * opacity only, FR-022). Under reduced motion the hook returns the static
 * shape (calm rule).
 */

/** Skeleton pulse tuning. */
export const SkeletonShapesConfig = {
  /** One full pulse (dim → base → dim) in ms. */
  pulseDurationMs: 1200,
  /** Low opacity of the pulse. */
  minOpacity: 0.5,
};

/** Shared skeleton pulse — one language for all shapes (FR-015). */
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

export function SkeletonShape({
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

/** Order card placeholder matching OrderSummaryCard layout. */
export function SkeletonOrderCard(props: { style?: StyleProp<ViewStyle>; testID?: string }) {
  const { theme } = useTheme();
  return (
    <View style={[orderStyles(theme).card, props.style]}>
      <View style={orderStyles(theme).topRow}>
        <SkeletonText style={orderStyles(theme).storeName} />
        <SkeletonShape style={orderStyles(theme).chevron} />
      </View>
      <View style={orderStyles(theme).metaRow}>
        <SkeletonText style={orderStyles(theme).dateLine} />
        <SkeletonShape style={orderStyles(theme).statusBadge} />
      </View>
      <View style={orderStyles(theme).divider} />
      <View style={orderStyles(theme).priceRow}>
        <SkeletonText style={orderStyles(theme).itemCount} />
        <SkeletonText style={orderStyles(theme).priceText} />
      </View>
    </View>
  );
}

/** Full Order detail / tracking page placeholder. */
export function SkeletonOrderDetail() {
  const { theme } = useTheme();
  return (
    <View style={orderDetailStyles(theme).container}>
      {/* Tracker Hero Card */}
      <View style={orderDetailStyles(theme).heroCard}>
        <SkeletonText style={orderDetailStyles(theme).heroTitle} />
        <SkeletonText style={orderDetailStyles(theme).heroSubtitle} />
        <View style={orderDetailStyles(theme).stepsRow}>
          {[0, 1, 2, 3].map((idx) => (
            <View key={idx} style={orderDetailStyles(theme).step}>
              <SkeletonShape style={orderDetailStyles(theme).stepDot} />
              <SkeletonText style={orderDetailStyles(theme).stepLabel} />
            </View>
          ))}
        </View>
      </View>

      {/* Store & Items Card */}
      <View style={orderDetailStyles(theme).itemsCard}>
        <SkeletonText style={orderDetailStyles(theme).cardHeader} />
        <View style={orderDetailStyles(theme).divider} />
        {[0, 1, 2].map((idx) => (
          <View key={idx} style={orderDetailStyles(theme).itemRow}>
            <SkeletonText style={orderDetailStyles(theme).itemName} />
            <SkeletonText style={orderDetailStyles(theme).itemPrice} />
          </View>
        ))}
        <View style={orderDetailStyles(theme).divider} />
        <View style={orderDetailStyles(theme).totalRow}>
          <SkeletonText style={orderDetailStyles(theme).totalLabel} />
          <SkeletonText style={orderDetailStyles(theme).totalValue} />
        </View>
      </View>

      {/* Address Card */}
      <View style={orderDetailStyles(theme).addressCard}>
        <SkeletonText style={orderDetailStyles(theme).addressTitle} />
        <SkeletonText style={orderDetailStyles(theme).addressLine} />
      </View>
    </View>
  );
}

/** Full Store detail page placeholder. */
export function SkeletonStoreDetail() {
  const { theme } = useTheme();
  return (
    <View style={storeDetailStyles(theme).container}>
      {/* Cover Banner */}
      <SkeletonShape style={storeDetailStyles(theme).banner} />

      {/* Store Info Card */}
      <View style={storeDetailStyles(theme).infoCard}>
        <SkeletonShape style={storeDetailStyles(theme).avatar} />
        <SkeletonText style={storeDetailStyles(theme).title} />
        <View style={storeDetailStyles(theme).metaRow}>
          <SkeletonShape style={storeDetailStyles(theme).pill} />
          <SkeletonShape style={storeDetailStyles(theme).pill} />
          <SkeletonShape style={storeDetailStyles(theme).pill} />
        </View>
      </View>

      {/* Categories Bar */}
      <View style={storeDetailStyles(theme).categoriesRow}>
        {[0, 1, 2, 3].map((idx) => (
          <SkeletonShape key={idx} style={storeDetailStyles(theme).categoryChip} />
        ))}
      </View>

      {/* Products List */}
      <View style={storeDetailStyles(theme).productsList}>
        {[0, 1, 2, 3].map((idx) => (
          <SkeletonItem key={idx} style={storeDetailStyles(theme).productItem} />
        ))}
      </View>
    </View>
  );
}

/** Full Product detail page placeholder. */
export function SkeletonProductDetail() {
  const { theme } = useTheme();
  return (
    <View style={productDetailStyles(theme).container}>
      {/* Hero Image */}
      <SkeletonShape style={productDetailStyles(theme).heroImage} />

      {/* Title & Price Card */}
      <View style={productDetailStyles(theme).infoCard}>
        <View style={productDetailStyles(theme).titleRow}>
          <SkeletonText style={productDetailStyles(theme).title} />
          <SkeletonShape style={productDetailStyles(theme).priceBadge} />
        </View>
        <SkeletonText style={productDetailStyles(theme).descLine1} />
        <SkeletonText style={productDetailStyles(theme).descLine2} />
      </View>

      {/* Options Card */}
      <View style={productDetailStyles(theme).optionsCard}>
        <SkeletonText style={productDetailStyles(theme).optionsTitle} />
        <View style={productDetailStyles(theme).optionsGrid}>
          {[0, 1, 2].map((idx) => (
            <SkeletonShape key={idx} style={productDetailStyles(theme).optionChip} />
          ))}
        </View>
      </View>

      {/* Bottom Sticky Action Placeholder */}
      <View style={productDetailStyles(theme).bottomBar}>
        <SkeletonShape style={productDetailStyles(theme).addButton} />
      </View>
    </View>
  );
}

/** All shapes, grouped for consumers and the gallery (SC-009). */
export const SkeletonShapes = {
  Text: SkeletonText,
  Image: SkeletonImage,
  Card: SkeletonCard,
  Item: SkeletonItem,
  ProductCard: SkeletonProductCard,
  StoreCard: SkeletonStoreCard,
  OrderCard: SkeletonOrderCard,
  OrderDetail: SkeletonOrderDetail,
  StoreDetail: SkeletonStoreDetail,
  ProductDetail: SkeletonProductDetail,
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
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.radii.large,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    thumb: {
      width: 64,
      height: 64,
      borderRadius: theme.radii.medium,
    },
    lines: {
      flex: 1,
      gap: theme.spacing.sm,
      alignItems: 'flex-end',
    },
    linePrimary: {
      height: 16,
      width: '75%',
      borderRadius: theme.radii.small,
    },
    lineSecondary: {
      height: 13,
      width: '45%',
      borderRadius: theme.radii.small,
    },
  });

const cardStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.large,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    image: {
      height: 110,
      borderRadius: theme.radii.medium,
    },
    wideImage: {
      height: 130,
      borderRadius: theme.radii.medium,
    },
    titleLine: {
      height: 16,
      width: '65%',
      borderRadius: theme.radii.small,
    },
    priceLine: {
      height: 16,
      width: '35%',
      borderRadius: theme.radii.small,
    },
    metaLine: {
      height: 13,
      width: '80%',
      borderRadius: theme.radii.small,
    },
  });

const orderStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: 16,
      gap: 12,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    storeName: {
      height: 18,
      width: '48%',
      borderRadius: theme.radii.small,
    },
    chevron: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dateLine: {
      height: 13,
      width: '40%',
      borderRadius: theme.radii.small,
    },
    statusBadge: {
      height: 24,
      width: 80,
      borderRadius: 12,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.divider,
      marginVertical: 2,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemCount: {
      height: 14,
      width: '30%',
      borderRadius: theme.radii.small,
    },
    priceText: {
      height: 16,
      width: '25%',
      borderRadius: theme.radii.small,
    },
  });

const orderDetailStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      gap: 16,
    },
    heroCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      alignItems: 'center',
    },
    heroTitle: {
      height: 22,
      width: '50%',
      borderRadius: theme.radii.small,
    },
    heroSubtitle: {
      height: 14,
      width: '65%',
      borderRadius: theme.radii.small,
    },
    stepsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginTop: 16,
      paddingHorizontal: 8,
    },
    step: {
      alignItems: 'center',
      gap: 8,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    stepLabel: {
      width: 50,
      height: 10,
      borderRadius: 4,
    },
    itemsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    cardHeader: {
      height: 18,
      width: '40%',
      borderRadius: theme.radii.small,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.divider,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    itemName: {
      height: 15,
      width: '55%',
      borderRadius: theme.radii.small,
    },
    itemPrice: {
      height: 15,
      width: '20%',
      borderRadius: theme.radii.small,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    totalLabel: {
      height: 18,
      width: '30%',
      borderRadius: theme.radii.small,
    },
    totalValue: {
      height: 18,
      width: '25%',
      borderRadius: theme.radii.small,
    },
    addressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.divider,
    },
    addressTitle: {
      height: 16,
      width: '35%',
      borderRadius: theme.radii.small,
    },
    addressLine: {
      height: 14,
      width: '75%',
      borderRadius: theme.radii.small,
    },
  });

const storeDetailStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    banner: {
      width: '100%',
      height: 160,
      borderRadius: 0,
    },
    infoCard: {
      padding: 16,
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    avatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      marginTop: -44,
      borderWidth: 3,
      borderColor: theme.colors.surface,
    },
    title: {
      height: 20,
      width: '45%',
      borderRadius: theme.radii.small,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 8,
    },
    pill: {
      height: 24,
      width: 70,
      borderRadius: 12,
    },
    categoriesRow: {
      flexDirection: 'row-reverse',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
    },
    categoryChip: {
      height: 36,
      width: 80,
      borderRadius: 18,
    },
    productsList: {
      padding: 16,
      gap: 12,
    },
    productItem: {
      width: '100%',
    },
  });

const productDetailStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    heroImage: {
      width: '100%',
      height: 260,
      borderRadius: 0,
    },
    infoCard: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      height: 22,
      width: '55%',
      borderRadius: theme.radii.small,
    },
    priceBadge: {
      height: 28,
      width: 75,
      borderRadius: 14,
    },
    descLine1: {
      height: 14,
      width: '90%',
      borderRadius: theme.radii.small,
    },
    descLine2: {
      height: 14,
      width: '60%',
      borderRadius: theme.radii.small,
    },
    optionsCard: {
      padding: 16,
      gap: 12,
    },
    optionsTitle: {
      height: 16,
      width: '35%',
      borderRadius: theme.radii.small,
    },
    optionsGrid: {
      flexDirection: 'row-reverse',
      gap: 10,
    },
    optionChip: {
      height: 44,
      width: 95,
      borderRadius: 12,
    },
    bottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
    },
    addButton: {
      height: 52,
      width: '100%',
      borderRadius: 16,
    },
  });
