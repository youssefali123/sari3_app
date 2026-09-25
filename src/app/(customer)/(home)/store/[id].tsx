import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { ProductRepository } from '@/features/products/domain/repositories/ProductRepository';
import { SupabaseProductRepository } from '@/features/products/infrastructure/SupabaseProductRepository';
import { CategoryTabBar } from '@/features/restaurants/presentation/CategoryTabBar';
import { ProductCard } from '@/features/products/presentation/ProductCard';
import { AddOnSelectorModal } from '@/features/products/presentation/AddOnSelectorModal';
import { StoreConflictModal } from '@/features/cart/presentation/StoreConflictModal';
import { useAddToCart } from '@/features/cart/application/useAddToCart';
import { CartItem } from '@/features/cart/domain/entities/CartItem';
import { generateCartItemId } from '@/features/cart/domain/cartUtils';
import { Product } from '@/features/products/domain/entities/Product';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

const storeRepository: StoreRepository = new SupabaseStoreRepository();
const productRepository: ProductRepository = new SupabaseProductRepository();

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = id as string;
  const router = useRouter();
  const { addItemWithConflictCheck } = useAddToCart();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [productForModal, setProductForModal] = useState<Product | null>(null);

  const storeQuery = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => storeRepository.getStoreById(storeId),
    enabled: Boolean(storeId),
  });

  const categoriesQuery = useQuery({
    queryKey: ['storeCategories', storeId],
    queryFn: () => storeRepository.getCategoriesByStoreId(storeId),
    enabled: Boolean(storeId),
  });

  const productsQuery = useQuery({
    queryKey: ['products', storeId, selectedCategoryId],
    queryFn: () => productRepository.getProductsByStore(storeId, selectedCategoryId ?? undefined),
    enabled: Boolean(storeId),
  });

  const addOnsQuery = useQuery({
    queryKey: ['addOns', productForModal?.id],
    queryFn: () => productRepository.getAddOnsByProductId(productForModal!.id),
    enabled: Boolean(productForModal),
  });

  const store = storeQuery.data;
  const storeIsOpen = store?.isOpen ?? false;

  const handleConfirmAddOns = useCallback(
    (selectedAddOnIds: string[]) => {
      if (!productForModal || !store) return;
      const allAddOns = addOnsQuery.data ?? [];
      const selectedAddOns = selectedAddOnIds
        .map((addonId) => allAddOns.find((a) => a.id === addonId))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
        .map((a) => ({
          addonId: a.id,
          name: a.name,
          unitPrice: a.price,
        }));

      const item: CartItem = {
        id: generateCartItemId(productForModal.id, selectedAddOnIds),
        productId: productForModal.id,
        productName: productForModal.name,
        productImageUrl: productForModal.imageUrl,
        baseUnitPrice: productForModal.price,
        addonIds: selectedAddOnIds,
        selectedAddOns,
        quantity: 1,
      };

      addItemWithConflictCheck({
        item,
        storeId: store.id,
        storeName: store.name,
      });
      setProductForModal(null);
      router.push('/(customer)/cart');
    },
    [productForModal, store, addOnsQuery.data, addItemWithConflictCheck, router],
  );

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  if (storeQuery.isLoading || !store) {
    return <LoadingSpinner />;
  }

  if (storeQuery.isError) {
    return <ErrorView message="Could not load this store." onRetry={storeQuery.refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={[styles.storeStatus, store.isOpen ? styles.open : styles.closed]}>
                {store.isOpen ? 'Open' : 'Closed — ordering unavailable'}
              </Text>
              {store.description ? (
                <Text style={styles.storeDescription}>{store.description}</Text>
              ) : null}
            </View>
            <CategoryTabBar
              categories={categoriesQuery.data ?? []}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            storeIsOpen={storeIsOpen}
            onPress={() => setProductForModal(item)}
          />
        )}
        ListEmptyComponent={
          productsQuery.isLoading ? (
            <LoadingSpinner />
          ) : (
            <EmptyState
              title="No products"
              message="This store has no products in this category yet."
              emoji="🍽️"
            />
          )
        }
        contentContainerStyle={styles.listContent}
      />

      <AddOnSelectorModal
        visible={Boolean(productForModal)}
        product={productForModal}
        addOns={addOnsQuery.data ?? []}
        onClose={() => setProductForModal(null)}
        onConfirm={handleConfirmAddOns}
      />
      <StoreConflictModal />
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
  header: {
    marginBottom: spacing.sm,
  },
  storeName: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  storeStatus: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  open: {
    color: colors.success,
  },
  closed: {
    color: colors.error,
  },
  storeDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
