import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';
import { FavoritesRepository } from '@/features/favorites/domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '@/features/favorites/infrastructure/SupabaseFavoritesRepository';
import { ProductCard } from '@/features/products/presentation/ProductCard';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
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
import { SkeletonItem } from '@/shared/ui/motion';

const favoritesRepository: FavoritesRepository = new SupabaseFavoritesRepository();
const storeRepository: StoreRepository = new SupabaseStoreRepository();

export default function FavoriteProductsScreen() {
  useRequireAuth('/(customer)/favorites/products');
  const router = useAppRouter();
  const colors = useColors();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const customerId = useCurrentCustomerId();
  const { selectedAreaId, selectedAreaName } = useSelectedArea();

  const {
    data: products,
    isLoading,
    isError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['favoriteProducts', customerId],
    queryFn: () => favoritesRepository.getFavoriteProducts(customerId!),
    enabled: Boolean(customerId),
  });

  // Feature 006: products are scoped by their STORE's area.
  const { data: stores, refetch: refetchStores } = useQuery({
    queryKey: ['stores', 'areaMap'],
    queryFn: () => storeRepository.getStores(),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchProducts(), refetchStores()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchProducts, refetchStores]);

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    if (!selectedAreaId) return products;
    const areaByStore = new Map((stores ?? []).map((s) => [s.id, s.areaId]));
    return products.filter((p) => areaByStore.get(p.storeId) === selectedAreaId);
  }, [products, stores, selectedAreaId]);

  if (!isAuthLoading && !user) {
    return (
      <AppScreen>
        <BrandHeader
          title="المنتجات المفضلة"
          subtitle="منتجاتك المحفوظة للطلب السريع"
          onBack={() => router.back()}
        />
        <AuthRequiredView
          icon="Heart"
          title="التسجيل مطلوب"
          message="سجّل دخولك للوصول إلى منتجاتك المفضلة."
          returnTo="/(customer)/favorites/products"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BrandHeader
        title="المنتجات المفضلة"
        subtitle="منتجاتك المحفوظة للطلب السريع"
        onBack={() => router.back()}
      />

      {isLoading ? (
        <View style={styles.listContent}>
          {[0, 1, 2].map((idx) => (
            <SkeletonItem key={idx} />
          ))}
        </View>
      ) : (
        <FlatList
          style={styles.container}
          data={isError ? [] : visibleProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              storeIsOpen
              onPress={() => router.push(`/product/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical
          contentContainerStyle={[
            styles.listContent,
            (visibleProducts.length === 0 || isError) && styles.emptyListContent,
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
                message="حدث خطأ أثناء جلب المنتجات المفضلة."
                onRetry={() => void onRefresh()}
              />
            ) : (
              <EmptyState
                emoji="🛍️"
                title={
                  (products?.length ?? 0) > 0
                    ? `لا توجد منتجات مفضلة في ${selectedAreaName ?? 'هذه المنطقة'}`
                    : 'لا توجد منتجات مفضلة بعد'
                }
                message={
                  (products?.length ?? 0) > 0
                    ? 'المفضلة من مناطق أخرى محفوظة — غيّر المنطقة لتراها.'
                    : 'اضغط على القلب بجانب أي منتج لحفظه هنا.'
                }
                action={
                  <PrimaryButton
                    title="تصفح المنتجات"
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
