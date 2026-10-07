import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Product } from '../domain/entities/Product';
import { formatCurrency } from '@/shared/utils/formatting';
import { cardPress, usePressAnimation } from '@/shared/ui/motion';
import { useColors } from '@/shared/ui/theme';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';

interface ProductRowProps {
  product: Product;
  /** The "+" quick-add button renders only while the store is open. */
  storeIsOpen?: boolean;
  onPress: () => void;
  onQuickAdd?: () => void;
  showStoreName?: boolean;
  storeName?: string;
}

/**
 * Catalog list row matching SOURCE ProductRow design:
 * RTL layout, rounded 20px card, 80x80 image, bold title, 2-line description,
 * formatted price, and a quick-add button with brand gold tint.
 */
export function ProductRow({
  product,
  storeIsOpen = true,
  onPress,
  onQuickAdd,
  showStoreName,
  storeName,
}: ProductRowProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(cardPress);

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}، ${formatCurrency(product.price)}`}
        testID={`product-${product.id}`}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
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

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.name,
                { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
              ]}
              numberOfLines={1}
            >
              {product.name}
            </Text>
          </View>

          {showStoreName && storeName ? (
            <Text
              style={[
                styles.storeName,
                { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
              ]}
            >
              {storeName}
            </Text>
          ) : null}

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

          <View style={styles.priceRow}>
            <Text
              style={[
                styles.price,
                { color: colors.foreground, fontFamily: theme.typography.price.fontFamily },
              ]}
            >
              {formatCurrency(product.price)}
            </Text>

            {storeIsOpen && onQuickAdd ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onQuickAdd();
                }}
                accessibilityRole="button"
                accessibilityLabel={`أضف ${product.name} إلى السلة`}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.quickAdd,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
                testID={`quick-add-${product.id}`}
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
  row: {
    minHeight: 105,
    borderRadius: 20,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 11,
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
  copy: {
    flex: 1,
    gap: 4,
    alignItems: 'stretch',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  storeName: {
    fontSize: 11,
    textAlign: 'right',
  },
  description: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'right',
  },
  priceRow: {
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
  quickAdd: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
