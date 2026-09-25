import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Store } from '../domain/entities/Store';
import { FavoriteButton } from '../../favorites/presentation/FavoriteButton';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface StoreCardProps {
  store: Store;
  onPress: () => void;
}

/**
 * Unified store card: displays restaurant vs market type badge (FR-002),
 * rating, and open/closed status.
 */
export function StoreCard({ store, onPress }: StoreCardProps) {
  const typeLabel = store.type === 'market' ? 'Market' : 'Restaurant';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
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
          <View
            style={[
              styles.typeBadge,
              store.type === 'market' ? styles.typeBadgeMarket : styles.typeBadgeRestaurant,
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                store.type === 'market' && styles.typeBadgeTextMarket,
              ]}
            >
              {typeLabel}
            </Text>
          </View>
          <FavoriteButton kind="store" targetId={store.id} />
        </View>
        {store.description ? (
          <Text style={styles.description} numberOfLines={1}>
            {store.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {store.rating !== null ? (
            <Text style={styles.rating}>★ {store.rating.toFixed(1)}</Text>
          ) : null}
          <Text style={[styles.status, store.isOpen ? styles.open : styles.closed]}>
            {store.isOpen ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: 96,
    height: 96,
    backgroundColor: colors.border,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    ...typography.h2,
    color: colors.textMuted,
  },
  info: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  typeBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  typeBadgeRestaurant: {
    backgroundColor: colors.primaryLight,
  },
  typeBadgeMarket: {
    backgroundColor: colors.warningLight,
  },
  typeBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '600',
  },
  typeBadgeTextMarket: {
    color: colors.textPrimary,
  },
  description: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  rating: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    marginRight: spacing.md,
  },
  status: {
    ...typography.caption,
    fontWeight: '600',
  },
  open: {
    color: colors.success,
  },
  closed: {
    color: colors.error,
  },
});
