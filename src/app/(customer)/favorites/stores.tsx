import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FavoritesRepository } from '@/features/favorites/domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '@/features/favorites/infrastructure/SupabaseFavoritesRepository';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
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

  if (isLoading || !customerId) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load favorite stores." onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={stores ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StoreCard
            store={item}
            onPress={() => router.push(`/(customer)/(home)/store/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No favorite stores"
            message="Tap the heart on a store to save it here."
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
