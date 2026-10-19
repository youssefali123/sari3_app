import React, { useMemo } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Store } from '../domain/entities/Store';
import { FavoriteButton } from '../../favorites/presentation/FavoriteButton';
import { useTheme } from '@/shared/ui/context/ThemeContext';

interface PopularStoreCardProps {
  store: Store;
  onPress: () => void;
  /** Overrides the card width (default fixed 170 for carousels). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Compact store card (feature 010 home rollout / Phase 3 screen design).
 * Image with a favorite-heart scrim and open/closed chip, name + rating,
 * cuisine/category line. Fast native Pressable with subtle opacity feedback;
 * the favorite pop comes from `FavoriteButton`. Fixed 170 wide by default
 * (home carousel); pass `style` to reuse it in grids/lists.
 */
export const PopularStoreCard = React.memo(function PopularStoreCard({ store, onPress, style }: PopularStoreCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const categoryLine =
    store.description?.trim() ||
    store.address?.trim() ||
    (store.type === 'market' ? 'كل احتياجاتك اليومية' : null);

  return (
    <Pressable
      onPress={onPress}
      unstable_pressDelay={0}
      accessibilityRole="button"
      accessibilityLabel={`${store.name}${store.rating !== null ? `، تقييم ${store.rating.toFixed(1)}` : ''}`}
      style={({ pressed }) => [
        styles.card,
        style,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.imageWrap}>
        {store.imageUrl ? (
          <Image
            source={{ uri: store.imageUrl }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={null}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>{store.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.favoriteScrim} pointerEvents="box-none">
          <FavoriteButton kind="store" targetId={store.id} overlay />
        </View>
        <View
          style={[
            styles.statusChip,
            store.isOpen ? styles.statusOpen : styles.statusClosed,
          ]}
        >
          <Text style={styles.statusChipText}>
            {store.isOpen ? 'مفتوح' : 'مغلق'}
          </Text>
        </View>
      </View>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {store.name}
          </Text>
          {store.rating !== null ? (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingValue}>{store.rating.toFixed(1)}</Text>
              <Text style={styles.ratingStar}>★</Text>
            </View>
          ) : null}
        </View>
        {categoryLine ? (
          <Text style={styles.category} numberOfLines={1}>
            {categoryLine}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    card: {
      width: 170,
      borderRadius: theme.radii.extraLarge,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.low,
    },
    cardPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    imageWrap: {
      height: 112,
      backgroundColor: theme.colors.secondary,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    imagePlaceholderText: {
      ...theme.typography.headingLarge,
      color: theme.colors.textMuted,
    },
    favoriteScrim: {
      position: 'absolute',
      top: 8,
      end: 8,
    },
    statusChip: {
      position: 'absolute',
      bottom: 8,
      end: 8,
      borderRadius: theme.radii.small,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    statusOpen: {
      backgroundColor: theme.colors.secondaryForeground,
    },
    statusClosed: {
      backgroundColor: theme.colors.overlay,
    },
    statusChipText: {
      ...theme.typography.caption,
      color: theme.colors.textInverse,
      fontWeight: '700',
    },
    info: {
      padding: theme.spacing.sm + 2,
      gap: 2,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.xs,
    },
    name: {
      ...theme.typography.label,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    ratingValue: {
      ...theme.typography.caption,
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    ratingStar: {
      fontSize: 12,
      color: '#e4aa12',
    },
    category: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
  });
