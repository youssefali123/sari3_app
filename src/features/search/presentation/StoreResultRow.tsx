import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { StoreSearchResult } from '../domain/entities/SearchResult';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';

interface StoreResultRowProps {
  result: StoreSearchResult;
  onPress: () => void;
}

/**
 * Modern Store result row matching Sari3 design system:
 * RTL card layout, 20px radius, store badge, Arabic open/closed status, and expo-image.
 */
export const StoreResultRow = React.memo(function StoreResultRow({
  result,
  onPress,
}: StoreResultRowProps) {
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
      accessibilityLabel={`${result.name}، ${result.isOpen ? 'مفتوح الآن' : 'مغلق حالياً'}`}
    >
      {/* Store Image */}
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
            <Icon name="Store" size={24} color={colors.mutedForeground} />
          </View>
        )}
      </View>

      {/* Store Info */}
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

        <View style={styles.badgeRow}>
          <View style={[styles.typeBadge, { backgroundColor: colors.secondary }]}>
            <Icon name="Store" size={12} color={colors.secondaryForeground} />
            <Text style={[styles.typeText, { color: colors.secondaryForeground }]}>
              متجر
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: result.isOpen ? '#27AE6018' : colors.destructive + '15',
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: result.isOpen ? '#27AE60' : colors.destructive },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: result.isOpen ? '#27AE60' : colors.destructive },
              ]}
            >
              {result.isOpen ? 'مفتوح الآن' : 'مغلق حالياً'}
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
    gap: 6,
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
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
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
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chevronWrap: {
    paddingLeft: 4,
  },
});

