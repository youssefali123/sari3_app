import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ProductRepository } from '@/features/products/domain/repositories/ProductRepository';
import { SupabaseProductRepository } from '@/features/products/infrastructure/SupabaseProductRepository';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { ProductConfigurator } from '@/features/products/presentation/ProductConfigurator';
import { FavoriteButton } from '@/features/favorites/presentation/FavoriteButton';
import { useAddToCart } from '@/features/cart/application/useAddToCart';
import { CartItem } from '@/features/cart/domain/entities/CartItem';
import { generateCartItemId } from '@/features/cart/domain/cartUtils';
import { showAlert } from '@/shared/utils/alert';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency } from '@/shared/utils/formatting';

const productRepository: ProductRepository = new SupabaseProductRepository();
const storeRepository: StoreRepository = new SupabaseStoreRepository();

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = id as string;
  const router = useRouter();
  const { addItemWithConflictCheck } = useAddToCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);

  const {
    data: product,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      try {
        return await productRepository.getProductById(productId);
      } catch (e) {
        // Directly-addressable route: a deleted product id resolves to a
        // handled "no longer available" state instead of a crash (FR-009).
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes('PGRST116') || message.includes('No rows')) {
          return null;
        }
        throw e;
      }
    },
    enabled: Boolean(productId),
  });

  const variantsQuery = useQuery({
    queryKey: ['variants', productId],
    queryFn: () => productRepository.getVariantsByProductId(productId),
    enabled: Boolean(productId) && Boolean(product),
  });

  const storeQuery = useQuery({
    queryKey: ['store', product?.storeId],
    queryFn: () => storeRepository.getStoreById(product!.storeId),
    enabled: Boolean(product),
  });

  const addOnsQuery = useQuery({
    queryKey: ['addOns', productId],
    queryFn: () => productRepository.getAddOnsByProductId(productId),
    enabled: Boolean(productId) && Boolean(product),
  });

  const store = storeQuery.data;
  const storeIsOpen = store?.isOpen ?? false;

  // All hooks run unconditionally (rules-of-hooks) — early returns happen
  // only after this block, using the narrowed values below.

  const unavailable = product !== null && product !== undefined && !product.isAvailable;
  const variants = useMemo(() => variantsQuery.data ?? [], [variantsQuery.data]);
  const addOns = useMemo(() => addOnsQuery.data ?? [], [addOnsQuery.data]);

  // Effective variant: the user's explicit pick if still valid, otherwise
  // the first available variant (a variant-product can never be added
  // without one — carried over from the modal).
  const availableVariants = useMemo(
    () => variants.filter((v) => v.isAvailable),
    [variants],
  );

  const selectedVariant = useMemo(() => {
    if (availableVariants.length === 0) return null;
    const pick = availableVariants.find((v) => v.id === selectedVariantId);
    return pick ?? availableVariants[0];
  }, [availableVariants, selectedVariantId]);

  const handleShare = useCallback(() => {
    if (!product) return;
    // Plain-text share (feature 007 FR-004): no deep links — OS share sheet.
    Share.share({
      message: `${product.name} — ${formatCurrency(product.price)} on Sari3`,
    }).catch(() => {
      // Share sheet dismissed or unavailable — no action.
    });
  }, [product]);

  const handleAddToCart = useCallback(() => {
    if (!product || !store) return;
    if (unavailable || storeIsOpen !== true) return;
    const hasVariants = variants.some((v) => v.isAvailable);
    if (hasVariants && !selectedVariant) return;

    const selectedAddOns = addOns
      .filter((a) => selectedAddOnIds.includes(a.id))
      .map((a) => ({ addonId: a.id, name: a.name, unitPrice: a.price }));

    const item: CartItem = {
      id: generateCartItemId(product.id, selectedVariant?.id ?? null, selectedAddOnIds),
      productId: product.id,
      productName: product.name,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      productImageUrl: product.imageUrl,
      baseUnitPrice: selectedVariant ? selectedVariant.price : product.price,
      addonIds: selectedAddOnIds,
      selectedAddOns,
      quantity,
    };

    addItemWithConflictCheck({
      item,
      storeId: store.id,
      storeName: store.name,
    });
    router.push('/(customer)/cart');
  }, [
    product,
    store,
    storeIsOpen,
    unavailable,
    selectedVariant,
    selectedAddOnIds,
    quantity,
    variants,
    addOns,
    addItemWithConflictCheck,
    router,
  ]);

  // ---- Early returns (all hooks declared above) ----

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return (
      <ErrorView
        message={error instanceof Error ? error.message : 'Could not load this product.'}
        onRetry={refetch}
      />
    );
  }

  if (product === null || product === undefined) {
    // Directly-addressable route: a deleted product id resolves to a handled
    // "no longer available" state instead of a crash (FR-009).
    return (
      <View style={styles.centered}>
        <Text style={styles.unavailableEmoji}>🍽️</Text>
        <Text style={styles.unavailableTitle}>This item is no longer available</Text>
        <Text style={styles.unavailableBody}>
          It may have been removed from the menu. Go back and browse for something else.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Narrowed: product is guaranteed non-null from here on.
  const currentProduct = product;
  const selectedAddOnsTotal = addOns
    .filter((a) => selectedAddOnIds.includes(a.id))
    .reduce((sum, a) => sum + a.price, 0);
  const base = selectedVariant ? selectedVariant.price : currentProduct.price;
  const totalPrice = (base + selectedAddOnsTotal) * quantity;

  const addToCartDisabled =
    unavailable || storeIsOpen !== true || (variants.some((v) => v.isAvailable) && !selectedVariant);

  const addToCartDisabledReason = unavailable
    ? 'This item is currently unavailable.'
    : storeIsOpen !== true
      ? `${store?.name ?? 'This store'} is closed — ordering is unavailable.`
      : variants.some((v) => v.isAvailable) && !selectedVariant
        ? 'Select a size first.'
        : null;

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.topBarSpacer} />
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => void handleShare()}
            activeOpacity={0.8}
          >
            <Text style={styles.shareIcon}>↗</Text>
          </TouchableOpacity>
        </View>

        {currentProduct.imageUrl ? (
          <View style={styles.imageWrapper}>
            <FavoriteButton kind="product" targetId={currentProduct.id} />
          </View>
        ) : null}

        <View style={styles.header}>
          <Text style={styles.name}>{currentProduct.name}</Text>
          <Text style={styles.price}>{formatCurrency(base)}</Text>
          {currentProduct.description ? (
            <Text style={styles.description}>{currentProduct.description}</Text>
          ) : null}
          {unavailable ? (
            <Text style={styles.unavailableNote}>This item is currently unavailable.</Text>
          ) : null}
          {store && storeIsOpen !== true ? (
            <Text style={styles.unavailableNote}>
              {store.name} is closed — ordering is unavailable right now.
            </Text>
          ) : null}
        </View>

        <View style={styles.configuratorCard}>
          <ProductConfigurator
            product={currentProduct}
            variants={variants}
            addOns={addOns}
            selectedVariantId={selectedVariantId}
            onSelectVariant={setSelectedVariantId}
            selectedAddOnIds={selectedAddOnIds}
            onToggleAddOn={(addonId) =>
              setSelectedAddOnIds((current) =>
                current.includes(addonId)
                  ? current.filter((id) => id !== addonId)
                  : [...current, addonId],
              )
            }
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
        </View>
      </ScrollView>

      <View style={styles.stickyBar}>
        <View style={styles.stickyTotal}>
          <Text style={styles.stickyTotalLabel}>Total</Text>
          <Text style={styles.stickyTotalValue}>{formatCurrency(totalPrice)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartButton, (addToCartDisabled || quantity < 1) && styles.buttonDisabled]}
          onPress={() => {
            if (addToCartDisabled) {
              showAlert(
                'Cannot add to cart',
                addToCartDisabledReason ?? 'Please try again.',
              );
              return;
            }
            handleAddToCart();
          }}
          disabled={addToCartDisabled}
          activeOpacity={0.8}
        >
          <Text style={styles.addToCartText}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl + 80,
  },
  imageWrapper: {
    position: 'relative',
  },
  topBar: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    zIndex: 10,
  },
  topBarSpacer: {
    flex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  backIcon: {
    fontSize: 18,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  shareButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  shareIcon: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  price: {
    ...typography.h3,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  unavailableNote: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.sm,
  },
  configuratorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  unavailableEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  unavailableTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  unavailableBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  backButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  stickyTotal: {
    flex: 1,
  },
  stickyTotalLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  stickyTotalValue: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  addToCartButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  addToCartText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700',
  },
});
