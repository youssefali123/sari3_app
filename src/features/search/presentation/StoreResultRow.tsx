import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StoreSearchResult } from '../domain/entities/SearchResult';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface StoreResultRowProps {
  result: StoreSearchResult;
  onPress: () => void;
}

/**
 * Store result row (feature 008 US1/US3/US4): image, name, rating, open/closed
 * badge. Closed stores remain tappable — navigation is never blocked.
 */
export function StoreResultRow({ result, onPress }: StoreResultRowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {result.imageUrl ? (
        <Image source={{ uri: result.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderEmoji}>🏪</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {result.name}
        </Text>
        <Text
          style={[
            styles.openStatus,
            result.isOpen ? styles.open : styles.closed,
          ]}
        >
          {result.isOpen ? 'Open' : 'Closed'}
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
  imagePlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
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
  openStatus: {
    ...typography.caption,
    fontWeight: '600',
  },
  open: {
    color: colors.success,
  },
  closed: {
    color: colors.error,
  },
  chevron: {
    ...typography.h3,
    color: colors.textMuted,
  },
  placeholderEmoji: {
    fontSize: 22,
  },
});

