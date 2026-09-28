import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FavoritesRepository } from '@/features/favorites/domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '@/features/favorites/infrastructure/SupabaseFavoritesRepository';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { useSelectedArea } from '@/features/areas/application/hooks/useSelectedArea';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';

const favoritesRepository: FavoritesRepository = new SupabaseFavoritesRepository();

export default function FavoriteStoresScreen() {
  useRequireAuth('/(customer)/favorites/stores');
  const router = useRouter();
  const customerId = useCurrentCustomerId();
  const { selectedAreaId, selectedAreaName } = useSelectedArea();

  const {
    data: stores,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['favoriteStores', customerId],
    queryFn: () => favoritesRepository.getFavoriteStores(customerId!),
    enabled: Boolean(customerId),
  });

  // Feature 006: favorites scoped to the currently selected browsing area.
  // With no area selected, all favorites are shown.
  const visibleStores = useMemo(() => {
    if (!stores) return [];
    if (!selectedAreaId) return stores;
    return stores.filter((s) => s.areaId === selectedAreaId);
  }, [stores, selectedAreaId]);

  if (isLoading || !customerId) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load favorite stores." onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleStores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StoreCard
            store={item}
            onPress={() => router.push(`/(customer)/(home)/store/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          visibleStores.length === 0 && (stores?.length ?? 0) > 0 ? (
            <EmptyState
              title={`No favorites in ${selectedAreaName ?? 'this area'}`}
              message="Your favorites from other areas are still saved — switch the area to see them."
              emoji="📍"
            />
          ) : (
            <EmptyState
              title="No favorite stores"
              message="Tap the heart on a store to save it here."
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
