import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Product } from '../domain/entities/Product';
import { FavoriteButton } from '../../favorites/presentation/FavoriteButton';
import { formatCurrency } from '@/shared/utils/formatting';
import { cardPress, usePressAnimation } from '@/shared/ui/motion';
import { useColors } from '@/shared/ui/theme';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';

interface ProductCardProps {
  product: Product;
  storeIsOpen: boolean;
  onPress: () => void;
  onQuickAdd?: () => void;
}

/**
 * Catalog product card matching the SOURCE design language:
 * RTL layout, rounded 20px card, 80x80 image, bold title, formatted price,
 * favorite heart button, and quick-add button.
 */
export function ProductCard({ product, storeIsOpen, onPress, onQuickAdd }: ProductCardProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(cardPress);

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={!storeIsOpen || !product.isAvailable}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}، ${formatCurrency(product.price)}`}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: (!storeIsOpen || !product.isAvailable) ? 0.6 : 1,
          },
        ]}
      >
        <View style={styles.imageWrap}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.image,
                styles.imagePlaceholder,
                { backgroundColor: colors.muted },
              ]}
            >
              <Icon name="Utensils" size={24} color={colors.mutedForeground} />
            </View>
          )}
          <View style={styles.favoriteWrap} pointerEvents="box-none">
            <FavoriteButton kind="product" targetId={product.id} overlay />
          </View>
        </View>

        <View style={styles.copy}>
          <Text
            style={[
              styles.name,
              { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
            ]}
            numberOfLines={1}
          >
            {product.name}
          </Text>

          {product.description ? (
            <Text
              numberOfLines={2}
              style={[
                styles.description,
                { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
              ]}
            >
              {product.description}
            </Text>
          ) : null}

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.price,
                { color: colors.foreground, fontFamily: theme.typography.price.fontFamily },
              ]}
            >
              {formatCurrency(product.price)}
            </Text>

            {onQuickAdd && storeIsOpen && product.isAvailable ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onQuickAdd();
                }}
                accessibilityRole="button"
                accessibilityLabel={`أضف ${product.name} إلى السلة`}
                hitSlop={8}
                style={[styles.addButton, { backgroundColor: colors.primary }]}
              >
                <Icon name="Plus" size={17} color={colors.primaryForeground} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 11,
  },
  card: {
    minHeight: 105,
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 11,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteWrap: {
    position: 'absolute',
    top: 4,
    left: 4,
    borderRadius: 14,
  },
  copy: {
    flex: 1,
    gap: 4,
    alignItems: 'stretch',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  description: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'right',
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
