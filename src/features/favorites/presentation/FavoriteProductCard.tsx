import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FavoriteButton } from './FavoriteButton';
import { Product } from '../../products/domain/entities/Product';
import { formatCurrency } from '@/shared/utils/formatting';
import { cardPress, usePressAnimation } from '@/shared/ui/motion';
import { useTheme } from '@/shared/ui/context/ThemeContext';

interface FavoriteProductCardProps {
  product: Product;
  onPress: () => void;
}

/**
 * Favorite product card (Phase 3 favorites design): rounded image, name,
 * and price, with the filled brand-gold favorite heart on the end side.
 * Shares the store card's visual language (same radii/shadow/press recipe).
 */
export function FavoriteProductCard({ product, onPress }: FavoriteProductCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(cardPress);

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`المفضلة: ${product.name}، ${formatCurrency(product.price)}`}
        style={styles.touchable}
      >
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>{product.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
            <FavoriteButton kind="product" targetId={product.id} activeColor={theme.colors.primary} />
          </View>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      ...theme.shadows.low,
    },
    touchable: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.sm + 2,
      gap: theme.spacing.sm + 2,
    },
    image: {
      width: 110,
      height: 110,
      borderRadius: theme.radii.large,
      backgroundColor: theme.colors.disabled,
    },
    imagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    imagePlaceholderText: {
      ...theme.typography.headingLarge,
      color: theme.colors.textMuted,
    },
    info: {
      flex: 1,
      gap: theme.spacing.xs,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    name: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    price: {
      ...theme.typography.price,
      color: theme.colors.secondary,
    },
  });
