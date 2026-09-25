import React from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { PromotionRepository } from '../domain/repositories/PromotionRepository';
import { SupabasePromotionRepository } from '../infrastructure/SupabasePromotionRepository';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

const promotionRepository: PromotionRepository = new SupabasePromotionRepository();

/**
 * Home screen promotional banners. Gracefully collapses to nothing (renders
 * null) when there are no active promotions or the query fails (FR-011).
 */
export function PromoBannerCarousel() {
  const router = useRouter();
  const { data: promotions, isLoading, isError } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: () => promotionRepository.getActivePromotions(),
  });

  if (isLoading || isError || !promotions || promotions.length === 0) {
    return null;
  }

  return (
    <FlatList
      horizontal
      data={promotions}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carousel}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.banner}
          onPress={() => router.push(`/(customer)/(home)/promotion/${item.id}`)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} />
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  carousel: {
    gap: spacing.sm,
    paddingRight: spacing.md,
    paddingBottom: spacing.sm,
  },
  banner: {
    width: 280,
    height: 120,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.border,
    justifyContent: 'flex-end',
  },
  bannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bannerTitle: {
    ...typography.h3,
    color: colors.white,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: spacing.sm,
  },
});
