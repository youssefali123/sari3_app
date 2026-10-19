import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';
import { useQuery } from '@tanstack/react-query';
import { PromotionRepository } from '@/features/promotions/domain/repositories/PromotionRepository';
import { SupabasePromotionRepository } from '@/features/promotions/infrastructure/SupabasePromotionRepository';
import { Store } from '@/features/restaurants/domain/entities/Store';
import { Product } from '@/features/products/domain/entities/Product';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { ProductCard } from '@/features/products/presentation/ProductCard';
import { SkeletonCard } from '@/shared/ui/motion';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { AppScreen, BrandHeader } from '@/shared/ui/components/AppUI';
import { useTheme } from '@/shared/ui/theme';

const promotionRepository: PromotionRepository = new SupabasePromotionRepository();

export default function PromotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const promotionId = id as string;
  const router = useAppRouter();
  const { theme } = useTheme();

  const {
    data: targets,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['promotionTargets', promotionId],
    queryFn: () => promotionRepository.getPromotionTargetItems(promotionId),
    enabled: Boolean(promotionId),
  });

  if (isLoading) {
    return (
      <AppScreen>
        <BrandHeader title="العرض الترويجي" subtitle="جاري تحميل المنتجات والمتاجر..." onBack={() => router.back()} />
        <View style={[styles.skeletonWrap, { padding: theme.spacing.md, gap: theme.spacing.md }]}>
          {[0, 1, 2, 3].map((idx) => (
            <SkeletonCard key={idx} style={{ height: 110, borderRadius: 16 }} />
          ))}
        </View>
      </AppScreen>
    );
  }

  if (isError) {
    return (
      <AppScreen>
        <BrandHeader title="العرض الترويجي" onBack={() => router.back()} />
        <ErrorView message="تعذر تحميل هذا العرض الترويجي." onRetry={refetch} />
      </AppScreen>
    );
  }

  const stores = targets?.stores ?? [];
  const products = targets?.products ?? [];

  type PromoItem =
    | { kind: 'store'; store: Store }
    | { kind: 'product'; product: Product };

  const listItems: PromoItem[] =
    stores.length > 0
      ? stores.map((store) => ({ kind: 'store' as const, store }))
      : products.map((product) => ({ kind: 'product' as const, product }));

  return (
    <AppScreen>
      <BrandHeader
        title="العرض الترويجي"
        subtitle={`${listItems.length} ${stores.length > 0 ? 'متاجر مشمولة' : 'منتجات مشمولة'}`}
        onBack={() => router.back()}
      />
      <FlatList
        style={styles.container}
        data={listItems}
        keyExtractor={(item) => (item.kind === 'store' ? item.store.id : item.product.id)}
        refreshing={false}
        onRefresh={refetch}
        renderItem={({ item }) =>
          item.kind === 'store' ? (
            <StoreCard
              store={item.store}
              onPress={() => router.push(`/store/${item.store.id}`)}
            />
          ) : (
            <ProductCard
              product={item.product}
              storeIsOpen
              onPress={() =>
                router.push(`/store/${item.product.storeId}`)
              }
            />
          )
        }
        ListEmptyComponent={
          <EmptyState
            title="لا توجد عناصر مرتبطة"
            message="لا توجد متاجر أو منتجات مرتبطة بهذا العرض حالياً."
            emoji="🎉"
          />
        }
        contentContainerStyle={[styles.listContent, { padding: theme.spacing.md, paddingBottom: theme.spacing.xl + 20 }]}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skeletonWrap: {
    flex: 1,
  },
  listContent: {
    gap: 12,
  },
});
