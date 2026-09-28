import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FavoritesRepository } from '@/features/favorites/domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '@/features/favorites/infrastructure/SupabaseFavoritesRepository';
import { ProductCard } from '@/features/products/presentation/ProductCard';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { useSelectedArea } from '@/features/areas/application/hooks/useSelectedArea';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';

const favoritesRepository: FavoritesRepository = new SupabaseFavoritesRepository();
const storeRepository: StoreRepository = new SupabaseStoreRepository();

export default function FavoriteProductsScreen() {
  useRequireAuth('/(customer)/favorites/products');
  const router = useRouter();
  const customerId = useCurrentCustomerId();
  const { selectedAreaId, selectedAreaName } = useSelectedArea();

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

  // Feature 006: products are scoped by their STORE's area. A storeId →
  // areaId map resolves each favorite product's region client-side.
  const { data: stores } = useQuery({
    queryKey: ['stores', 'areaMap'],
    queryFn: () => storeRepository.getStores(),
  });

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    if (!selectedAreaId) return products;
    const areaByStore = new Map((stores ?? []).map((s) => [s.id, s.areaId]));
    return products.filter((p) => areaByStore.get(p.storeId) === selectedAreaId);
  }, [products, stores, selectedAreaId]);

  if (isLoading || !customerId) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load favorite products." onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            storeIsOpen
            onPress={() => router.push(`/product/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          visibleProducts.length === 0 && (products?.length ?? 0) > 0 ? (
            <EmptyState
              title={`No favorites in ${selectedAreaName ?? 'this area'}`}
              message="Your favorites from other areas are still saved — switch the area to see them."
              emoji="📍"
            />
          ) : (
            <EmptyState
              title="No favorite products"
              message="Tap the heart on a product to save it here."
              emoji="❤️"
            />
          )
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
