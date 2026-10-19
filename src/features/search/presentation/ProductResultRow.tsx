import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ProductSearchResult } from '../domain/entities/SearchResult';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';

interface ProductResultRowProps {
  result: ProductSearchResult;
  onPress: () => void;
}

/**
 * Modern Product result row matching Sari3 design system:
 * RTL card layout, 20px radius, product badge, store name reference, and expo-image.
 */
export const ProductResultRow = React.memo(function ProductResultRow({
  result,
  onPress,
}: ProductResultRowProps) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
      onPress={onPress}
      unstable_pressDelay={0}
      accessibilityRole="button"
      accessibilityLabel={`${result.name} من ${result.storeName}`}
    >
      {/* Product Image */}
      <View style={styles.imageWrap}>
        {result.imageUrl ? (
          <Image
            source={{ uri: result.imageUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={null}
          />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.muted }]}>
            <Icon name="UtensilsCrossed" size={24} color={colors.mutedForeground} />
          </View>
        )}
      </View>

      {/* Product & Store Info */}
      <View style={styles.info}>
        <View style={styles.headerLine}>
          <Text
            style={[
              styles.name,
              { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
            ]}
            numberOfLines={1}
          >
            {result.name}
          </Text>
        </View>

        {/* Store Reference */}
        <View style={styles.storeLine}>
          <Icon name="Store" size={13} color={colors.mutedForeground} />
          <Text
            style={[
              styles.storeName,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.caption.fontFamily,
              },
            ]}
            numberOfLines={1}
          >
            من متجر: {result.storeName}
          </Text>
        </View>

        {/* Badge Row */}
        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.secondary }]}>
            <Icon name="Utensils" size={12} color={colors.secondaryForeground} />
            <Text style={[styles.typeText, { color: colors.secondaryForeground }]}>
              صنف / منتج
            </Text>
          </View>
        </View>
      </View>

      {/* Action Chevron */}
      <View style={styles.chevronWrap}>
        <Icon name="ChevronLeft" size={20} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: 62,
    height: 62,
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
    alignItems: 'flex-end',
  },
  headerLine: {
    width: '100%',
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  storeLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  storeName: {
    fontSize: 12,
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  typeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronWrap: {
    paddingLeft: 4,
  },
});

