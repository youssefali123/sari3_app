import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FavoriteButton } from './FavoriteButton';
import { Store } from '../../restaurants/domain/entities/Store';
import { cardPress, usePressAnimation } from '@/shared/ui/motion';
import { useTheme } from '@/shared/ui/context/ThemeContext';

interface FavoriteStoreCardProps {
  store: Store;
  onPress: () => void;
}

/**
 * Favorite store card (Phase 3 favorites design): rounded image, name,
 * cuisine/category line, green-star rating and open/closed chip, with the
 * filled brand-gold favorite heart on the end side. Press feedback uses the
 * shared `cardPress` recipe; the heart pop comes from `FavoriteButton`.
 */
export function FavoriteStoreCard({ store, onPress }: FavoriteStoreCardProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(cardPress);

  const categoryLine =
    store.description?.trim() ||
    store.address?.trim() ||
    (store.type === 'market' ? 'كل احتياجاتك اليومية' : null);

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`المفضلة: ${store.name}${store.rating !== null ? `، تقييم ${store.rating.toFixed(1)}` : ''}`}
        style={styles.touchable}
      >
        {store.imageUrl ? (
          <Image source={{ uri: store.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.imagePlaceholderText}>{store.name.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {store.name}
            </Text>
            <FavoriteButton kind="store" targetId={store.id} activeColor={theme.colors.primary} />
          </View>
          {categoryLine ? (
            <Text style={styles.category} numberOfLines={1}>
              {categoryLine}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            {store.rating !== null ? (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingValue}>{store.rating.toFixed(1)}</Text>
                <Text style={styles.ratingStar}>★</Text>
              </View>
            ) : null}
            <View
              style={[styles.statusChip, store.isOpen ? styles.statusOpen : styles.statusClosed]}
            >
              <Text style={[styles.statusChipText, !store.isOpen && styles.statusChipClosed]}>
                {store.isOpen ? 'مفتوح' : 'مغلق'}
              </Text>
            </View>
          </View>
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
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    name: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    category: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    ratingValue: {
      ...theme.typography.numeric,
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    ratingStar: {
      fontSize: 13,
      color: theme.colors.success,
    },
    statusChip: {
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    statusOpen: {
      backgroundColor: theme.colors.successSubtle,
    },
    statusClosed: {
      backgroundColor: theme.colors.disabled,
    },
    statusChipText: {
      ...theme.typography.caption,
      color: theme.colors.success,
      fontWeight: '700',
    },
    statusChipClosed: {
      color: theme.colors.textMuted,
    },
  });
