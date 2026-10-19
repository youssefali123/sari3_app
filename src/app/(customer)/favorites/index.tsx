import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';

import { FavoritesRepository } from '@/features/favorites/domain/repositories/FavoritesRepository';
import { SupabaseFavoritesRepository } from '@/features/favorites/infrastructure/SupabaseFavoritesRepository';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { Store } from '@/features/restaurants/domain/entities/Store';
import { Product } from '@/features/products/domain/entities/Product';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { ProductCard } from '@/features/products/presentation/ProductCard';
import { useSelectedArea } from '@/features/areas/application/hooks/useSelectedArea';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { useColors } from '@/shared/ui/hooks/useColors';
import {
  AppScreen,
  AuthRequiredView,
  BrandHeader,
  EmptyState,
  ErrorState,
  PrimaryButton,
  Surface,
} from '@/shared/ui/components';
import { Icon } from '@/shared/ui/components/Icon';
import {
  SkeletonCard,
  SkeletonItem,
} from '@/shared/ui/motion';

const favoritesRepository: FavoritesRepository = new SupabaseFavoritesRepository();
const storeRepository: StoreRepository = new SupabaseStoreRepository();

type FavoritesTab = 'restaurants' | 'markets' | 'products';

const TABS: { key: FavoritesTab; label: string }[] = [
  { key: 'restaurants', label: 'مطاعم' },
  { key: 'markets', label: 'متاجر' },
  { key: 'products', label: 'منتجات' },
];

/**
 * المفضلة (SOURCE-aligned design):
 * BrandHeader, segmented pill bar, rich favorite cards, and bottom tip card.
 * Keeps existing favorites data flow (repository + area scoping) 100% intact.
 */
export default function FavoritesScreen() {
  useRequireAuth('/(customer)/favorites');
  const router = useAppRouter();
  const colors = useColors();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [tab, setTab] = useState<FavoritesTab>('restaurants');
  const [refreshing, setRefreshing] = useState(false);
  const customerId = useCurrentCustomerId();
  const { selectedAreaId, selectedAreaName } = useSelectedArea();

  const {
    data: stores,
    isLoading: storesLoading,
    isError: storesError,
    refetch: refetchStores,
  } = useQuery({
    queryKey: ['favoriteStores', customerId],
    queryFn: () => favoritesRepository.getFavoriteStores(customerId!),
    enabled: Boolean(customerId),
  });

  const {
    data: products,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['favoriteProducts', customerId],
    queryFn: () => favoritesRepository.getFavoriteProducts(customerId!),
    enabled: Boolean(customerId),
  });

  // Feature 006: favorites scoped to the selected browsing area.
  const visibleStores = useMemo(() => {
    if (!stores) return [];
    const scoped = selectedAreaId
      ? stores.filter((s) => s.areaId === selectedAreaId)
      : stores;
    return tab === 'restaurants'
      ? scoped.filter((s) => s.type === 'restaurant')
      : scoped.filter((s) => s.type === 'market');
  }, [stores, selectedAreaId, tab]);

  const { data: areaMapStores, refetch: refetchAreaMap } = useQuery({
    queryKey: ['stores', 'areaMap'],
    queryFn: () => storeRepository.getStores(),
  });

  const visibleProducts = useMemo(() => {
    if (!products) return [];
    if (!selectedAreaId) return products;
    const areaByStore = new Map((areaMapStores ?? []).map((s) => [s.id, s.areaId]));
    return products.filter((p) => areaByStore.get(p.storeId) === selectedAreaId);
  }, [products, areaMapStores, selectedAreaId]);

  const isLoading =
    tab === 'products' ? productsLoading : storesLoading;
  const isError = tab === 'products' ? productsError : storesError;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStores(),
        refetchProducts(),
        refetchAreaMap(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchStores, refetchProducts, refetchAreaMap]);

  const itemCount =
    tab === 'products' ? visibleProducts.length : visibleStores.length;
  const totalSaved =
    (stores?.length ?? 0) + (products?.length ?? 0);

  const renderRow = ({ item }: { item: Store | Product }) =>
    'storeId' in item ? (
      <ProductCard
        product={item}
        storeIsOpen={areaMapStores?.find((s) => s.id === item.storeId)?.isOpen ?? true}
        onPress={() => router.push(`/product/${item.id}`)}
      />
    ) : (
      <StoreCard
        store={item}
        onPress={() => router.push(`/store/${item.id}`)}
      />
    );

  if (!isAuthLoading && !user) {
    return (
      <AppScreen>
        <BrandHeader title="المفضلة" subtitle="كل اختياراتك المحببة" />
        <AuthRequiredView
          icon="Heart"
          title="التسجيل مطلوب"
          message="سجّل دخولك للوصول إلى قائمتك المفضلة وحفظ المطاعم والأطباق التي تحبها."
          returnTo="/(customer)/favorites"
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BrandHeader title="المفضلة" subtitle="كل اختياراتك المحببة" />

      {/* Segmented control matching SOURCE */}
      <View style={styles.segmentContainer}>
        <View style={[styles.segment, { backgroundColor: colors.muted }]}>
          {TABS.map(({ key, label }) => {
            const active = tab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.segmentButton,
                  active && { backgroundColor: colors.primary },
                ]}
                onPress={() => setTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label} — قائمة المفضلة`}
              >
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: active ? colors.foreground : colors.mutedForeground,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.listContent}>
          {tab === 'products'
            ? [0, 1, 2].map((i) => <SkeletonItem key={i} />)
            : [0, 1, 2].map((i) => (
                <SkeletonCard
                  key={i}
                  style={{ height: 110, borderRadius: 20 }}
                />
              ))}
        </View>
      ) : (
        <FlatList
          style={styles.container}
          data={isError ? [] : (tab === 'products' ? visibleProducts : visibleStores)}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical
          contentContainerStyle={[
            styles.listContent,
            (itemCount === 0 || isError) && styles.emptyListContent,
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
                message="حدث خطأ أثناء جلب المفضلة. حاول مرة أخرى."
                onRetry={() => void onRefresh()}
              />
            ) : (
              <EmptyState
                emoji="💛"
                title={
                  totalSaved > 0
                    ? `لا يوجد في ${TABS.find((t) => t.key === tab)?.label} داخل ${selectedAreaName ?? 'هذه المنطقة'}`
                    : 'قائمتك المفضلة فارغة'
                }
                message={
                  totalSaved > 0
                    ? 'المفضلة من مناطق أخرى محفوظة — غيّر المنطقة لتراها.'
                    : 'اضغط على علامة القلب بجانب أي مطعم أو منتج لحفظه هنا.'
                }
                action={
                  <PrimaryButton
                    title={totalSaved > 0 ? 'العودة للرئيسية' : 'تصفح المتاجر'}
                    icon="basket"
                    onPress={() => router.push('/(customer)/(home)' as never)}
                  />
                }
              />
            )
          }
          ListFooterComponent={
            !isError && itemCount > 0 ? (
              <Surface style={styles.tipCard}>
                <Icon name="Heart" size={18} color={colors.destructive} />
                <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                  احفظ مطاعمك ومنتجاتك المفضلة لتجدها بسرعة في المرة القادمة.
                </Text>
              </Surface>
            ) : null
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
  segmentContainer: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  segment: {
    flexDirection: 'row-reverse',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 13,
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
  tipCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 14,
    borderRadius: 18,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    textAlign: 'right',
  },
});
