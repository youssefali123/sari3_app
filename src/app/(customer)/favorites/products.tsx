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
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
} from '@/shared/ui/components';

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

  // Feature 006: products are scoped by their STORE's area.
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

  return (
    <AppScreen>
      <BrandHeader
        title="المنتجات المفضلة"
        subtitle="منتجاتك المحفوظة للطلب السريع"
        onBack={() => router.back()}
      />

      {isLoading || !customerId ? (
        <LoadingState />
      ) : isError ? (
        <View style={styles.centerContainer}>
          <ErrorState
            title="تعذر التحميل"
            message="حدث خطأ أثناء جلب المنتجات المفضلة."
            onRetry={() => void refetch()}
          />
        </View>
      ) : visibleProducts.length === 0 ? (
        <View style={styles.centerContainer}>
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
        </View>
      ) : (
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
