import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { PromotionRepository } from '@/features/promotions/domain/repositories/PromotionRepository';
import { SupabasePromotionRepository } from '@/features/promotions/infrastructure/SupabasePromotionRepository';
import { Store } from '@/features/restaurants/domain/entities/Store';
import { Product } from '@/features/products/domain/entities/Product';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { ProductCard } from '@/features/products/presentation/ProductCard';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';

const promotionRepository: PromotionRepository = new SupabasePromotionRepository();

export default function PromotionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const promotionId = id as string;
  const router = useRouter();

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
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load this promotion." onRetry={refetch} />;
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
    <View style={styles.container}>
      <FlatList
        data={listItems}
        keyExtractor={(item) => (item.kind === 'store' ? item.store.id : item.product.id)}
        renderItem={({ item }) =>
          item.kind === 'store' ? (
            <StoreCard
              store={item.store}
              onPress={() => router.push(`/(customer)/(home)/store/${item.store.id}`)}
            />
          ) : (
            <ProductCard
              product={item.product}
              storeIsOpen
              onPress={() =>
                router.push(`/(customer)/(home)/store/${item.product.storeId}`)
              }
            />
          )
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing promoted"
            message="This promotion has no linked items right now."
            emoji="🎉"
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
