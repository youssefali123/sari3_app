import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ProductSearchResult } from '../domain/entities/SearchResult';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface ProductResultRowProps {
  result: ProductSearchResult;
  onPress: () => void;
}

/**
 * Product result row (feature 008 US1/US3): product image, name, and parent
 * store name. Tap navigates directly to the dedicated product screen.
 */
export function ProductResultRow({ result, onPress }: ProductResultRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {result.imageUrl ? (
        <Image source={{ uri: result.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderEmoji}>🍽️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {result.name}
        </Text>
        <Text style={styles.storeName} numberOfLines={1}>
          from {result.storeName}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  storeName: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  chevron: {
    ...typography.h3,
    color: colors.textMuted,
  },
  placeholderEmoji: {
    fontSize: 22,
  },
});
