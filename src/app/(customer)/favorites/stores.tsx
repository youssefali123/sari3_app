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
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
} from '@/shared/ui/components';

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
  const visibleStores = useMemo(() => {
    if (!stores) return [];
    if (!selectedAreaId) return stores;
    return stores.filter((s) => s.areaId === selectedAreaId);
  }, [stores, selectedAreaId]);

  return (
    <AppScreen>
      <BrandHeader
        title="المتاجر المفضلة"
        subtitle="متاجرك المحفوظة للطلب السريع"
        onBack={() => router.back()}
      />

      {isLoading || !customerId ? (
        <LoadingState />
      ) : isError ? (
        <View style={styles.centerContainer}>
          <ErrorState
            title="تعذر التحميل"
            message="حدث خطأ أثناء جلب المتاجر المفضلة."
            onRetry={() => void refetch()}
          />
        </View>
      ) : visibleStores.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="🏪"
            title={
              (stores?.length ?? 0) > 0
                ? `لا توجد متاجر مفضلة في ${selectedAreaName ?? 'هذه المنطقة'}`
                : 'لا توجد متاجر مفضلة بعد'
            }
            message={
              (stores?.length ?? 0) > 0
                ? 'المفضلة من مناطق أخرى محفوظة — غيّر المنطقة لتراها.'
                : 'اضغط على القلب بجانب أي متجر لحفظه هنا.'
            }
            action={
              <PrimaryButton
                title="تصفح المتاجر"
                icon="basket"
                onPress={() => router.push('/(customer)/(home)' as never)}
              />
            }
          />
        </View>
      ) : (
        <FlatList
          data={visibleStores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StoreCard
              store={item}
              onPress={() => router.push(`/(customer)/(home)/store/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 12,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
    paddingBottom: 80,
  },
});
