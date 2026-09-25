import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FavoritesRepository } from '../domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '../infrastructure/SupabaseFavoritesRepository';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { colors } from '@/shared/ui/theme/colors';

const favoritesRepository: FavoritesRepository = new SupabaseFavoritesRepository();

type FavoriteKind = 'store' | 'product';

interface FavoriteButtonProps {
  kind: FavoriteKind;
  targetId: string;
}

/**
 * Heart icon toggle for favoriting/unfavoriting a store or product.
 * Store and product favorites operate fully independently (FR-008–FR-010).
 */
export function FavoriteButton({ kind, targetId }: FavoriteButtonProps) {
  const customerId = useCurrentCustomerId();
  const queryClient = useQueryClient();
  const router = useRouter();

  const listKey = kind === 'store' ? 'favoriteStoreIds' : 'favoriteProductIds';

  const { data: favoriteIds } = useQuery({
    queryKey: [listKey, customerId],
    queryFn: async () => {
      if (kind === 'store') {
        const stores = await favoritesRepository.getFavoriteStores(customerId!);
        return stores.map((s) => s.id);
      }
      const products = await favoritesRepository.getFavoriteProducts(customerId!);
      return products.map((p) => p.id);
    },
    enabled: Boolean(customerId),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async (nextIsFavorite: boolean) => {
      if (!customerId) throw new Error('Sign in to save favorites');
      if (kind === 'store') {
        if (nextIsFavorite) {
          await favoritesRepository.addFavoriteStore(customerId, targetId);
        } else {
          await favoritesRepository.removeFavoriteStore(customerId, targetId);
        }
      } else if (nextIsFavorite) {
        await favoritesRepository.addFavoriteProduct(customerId, targetId);
      } else {
        await favoritesRepository.removeFavoriteProduct(customerId, targetId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [listKey] }),
  });

  const isFavorite = favoriteIds?.includes(targetId) ?? false;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={(event) => {
        event.stopPropagation();
        // Guests are redirected to auth instead of silently failing (FR-003).
        if (!customerId) {
          router.push({
            pathname: '/(auth)/login',
            params: { returnTo: '/(customer)/favorites/stores' },
          });
          return;
        }
        mutation.mutate(!isFavorite);
      }}
      hitSlop={8}
      disabled={mutation.isPending}
    >
      <Text style={[styles.heart, isFavorite && styles.heartActive]}>
        {isFavorite ? '♥' : '♡'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
  },
  heart: {
    fontSize: 22,
    lineHeight: 26,
    color: colors.textMuted,
  },
  heartActive: {
    color: colors.error,
  },
});
