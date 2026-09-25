import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FavoritesRepository } from '@/features/favorites/domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '@/features/favorites/infrastructure/SupabaseFavoritesRepository';
import { ProductCard } from '@/features/products/presentation/ProductCard';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';

const favoritesRepository: FavoritesRepository = new SupabaseFavoritesRepository();

export default function FavoriteProductsScreen() {
  useRequireAuth('/(customer)/favorites/products');
  const router = useRouter();
  const customerId = useCurrentCustomerId();

  const {
    data: products,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['favoriteProducts', customerId],
    queryFn: () => favoritesRepository.getFavoriteProducts(customerId!),
    enabled: Boolean(customerId),
  });

  if (isLoading || !customerId) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load favorite products." onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            storeIsOpen
            onPress={() => router.push(`/(customer)/(home)/store/${item.storeId}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No favorite products"
            message="Tap the heart on a product to save it here."
            emoji="❤️"
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
});
