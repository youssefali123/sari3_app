import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Product } from '../domain/entities/Product';
import { FavoriteButton } from '../../favorites/presentation/FavoriteButton';
import { formatCurrency } from '@/shared/utils/formatting';
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
export const ProductCard = React.memo(function ProductCard({
  product,
  storeIsOpen,
  onPress,
  onQuickAdd,
}: ProductCardProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const disabled = !storeIsOpen || !product.isAvailable;

  return (
    <Pressable
      onPress={onPress}
      unstable_pressDelay={0}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}، ${formatCurrency(product.price)}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed && !disabled ? 0.985 : 1 }],
        },
      ]}
    >
        <View style={styles.imageWrap}>
          {product.imageUrl ? (
            <Image
              source={{ uri: product.imageUrl }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={null}
            />
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
                unstable_pressDelay={0}
                accessibilityRole="button"
                accessibilityLabel={`أضف ${product.name} إلى السلة`}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.addButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
              >
                <Icon name="Plus" size={17} color={colors.primaryForeground} strokeWidth={2.5} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </Pressable>
  );
});

const styles = StyleSheet.create({
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
