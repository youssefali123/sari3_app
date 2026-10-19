import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Store } from '../domain/entities/Store';
import { FavoriteButton } from '../../favorites/presentation/FavoriteButton';
import { useColors } from '@/shared/ui/theme';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';

interface StoreCardProps {
  store: Store;
  onPress: () => void;
}

/**
 * Unified store card matching the SOURCE VenueTile design language:
 * RTL layout, rounded 20px surfaces, 82x82 hero image with floating favorite heart,
 * star rating, delivery/status details, and chevron navigation cue.
 */
export const StoreCard = React.memo(function StoreCard({ store, onPress }: StoreCardProps) {
  const colors = useColors();
  const { theme } = useTheme();

  const subtitle =
    store.category?.trim() ||
    store.description?.trim() ||
    (store.type === 'market' ? 'احتياجاتك اليومية' : 'أطيب الأكلات');

  return (
    <Pressable
      onPress={onPress}
      unstable_pressDelay={0}
      accessibilityRole="button"
      accessibilityLabel={`${store.name}، ${store.isOpen ? 'مفتوح' : 'مغلق'}`}
      testID={`venue-${store.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
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
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
              { backgroundColor: colors.secondary },
            ]}
          >
            <Icon
              name={store.type === 'market' ? 'ShoppingBasket' : 'Utensils'}
              size={30}
              color={colors.secondaryForeground}
            />
          </View>
        )}
        <View style={styles.favoriteWrap} pointerEvents="box-none">
          <FavoriteButton kind="store" targetId={store.id} overlay />
        </View>
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.name,
              { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
            ]}
            numberOfLines={1}
          >
            {store.name}
          </Text>
          {store.rating !== null ? (
            <View style={styles.ratingRow}>
              <Icon name="Star" size={13} color="#e4aa12" />
              <Text
                style={[
                  styles.ratingText,
                  { color: colors.foreground, fontFamily: theme.typography.caption.fontFamily },
                ]}
              >
                {store.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[
            styles.subtitle,
            { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>

        <View style={styles.metaRow}>
          <Text
            style={[
              styles.deliveryText,
              {
                color: store.isOpen ? colors.secondaryForeground : colors.destructive,
                fontFamily: theme.typography.caption.fontFamily,
              },
            ]}
          >
            {store.isOpen ? 'توصيل متاح · 20-30 دقيقة' : 'مغلق حالياً'}
          </Text>
        </View>
      </View>

      <Icon name="ChevronLeft" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: 20,
    padding: 11,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: 82,
    height: 82,
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
    borderRadius: 15,
  },
  copy: {
    flex: 1,
    gap: 5,
    alignItems: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  deliveryText: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'right',
  },
});
