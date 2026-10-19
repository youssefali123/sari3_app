import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';
import { FavoritesRepository } from '@/features/favorites/domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '@/features/favorites/infrastructure/SupabaseFavoritesRepository';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { useSelectedArea } from '@/features/areas/application/hooks/useSelectedArea';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { useColors } from '@/shared/ui/hooks/useColors';
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  ErrorState,
  PrimaryButton,
  AuthRequiredView,
} from '@/shared/ui/components';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { SkeletonCard } from '@/shared/ui/motion';

const favoritesRepository: FavoritesRepository = new SupabaseFavoritesRepository();

export default function FavoriteStoresScreen() {
  useRequireAuth('/(customer)/favorites/stores');
  const router = useAppRouter();
  const colors = useColors();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Feature 006: favorites scoped to the currently selected browsing area.
  const visibleStores = useMemo(() => {
    if (!stores) return [];
    if (!selectedAreaId) return stores;
    return stores.filter((s) => s.areaId === selectedAreaId);
  }, [stores, selectedAreaId]);

  if (!isAuthLoading && !user) {
    return (
      <AppScreen>
        <BrandHeader
          title="المتاجر المفضلة"
          subtitle="متاجرك المحفوظة للطلب السريع"
          onBack={() => router.back()}
        />
        <AuthRequiredView
          icon="Heart"
          title="التسجيل مطلوب"
          message="سجّل دخولك للوصول إلى متاجرك المفضلة."
          returnTo="/(customer)/favorites/stores"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BrandHeader
        title="المتاجر المفضلة"
        subtitle="متاجرك المحفوظة للطلب السريع"
        onBack={() => router.back()}
      />

      {isLoading ? (
        <View style={styles.listContent}>
          {[0, 1, 2].map((idx) => (
            <SkeletonCard key={idx} style={{ height: 110, borderRadius: 20 }} />
          ))}
        </View>
      ) : (
        <FlatList
          style={styles.container}
          data={isError ? [] : visibleStores}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StoreCard
              store={item}
              onPress={() => router.push(`/store/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical
          contentContainerStyle={[
            styles.listContent,
            (visibleStores.length === 0 || isError) && styles.emptyListContent,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            isError ? (
              <ErrorState
                title="تعذر التحميل"
                message="حدث خطأ أثناء جلب المتاجر المفضلة."
                onRetry={() => void onRefresh()}
              />
            ) : (
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
            )
          }
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 12,
    paddingBottom: 120,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 80,
  },
});
