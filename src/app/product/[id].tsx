import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { ProductRepository } from '@/features/products/domain/repositories/ProductRepository';
import { SupabaseProductRepository } from '@/features/products/infrastructure/SupabaseProductRepository';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { FavoriteButton } from '@/features/favorites/presentation/FavoriteButton';
import { useAddToCart } from '@/features/cart/application/useAddToCart';
import { CartItem } from '@/features/cart/domain/entities/CartItem';
import { generateCartItemId } from '@/features/cart/domain/cartUtils';
import { StoreConflictModal } from '@/features/cart/presentation/StoreConflictModal';
import { useColors } from '@/shared/ui/hooks/useColors';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  PrimaryButton,
  SectionTitle,
  Surface,
} from '@/shared/ui/components';
import { formatCurrency } from '@/shared/utils/formatting';

const productRepository: ProductRepository = new SupabaseProductRepository();
const storeRepository: StoreRepository = new SupabaseStoreRepository();

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = id as string;
  const router = useRouter();
  const colors = useColors();
  const { theme } = useTheme();
  const { addItemWithConflictCheck } = useAddToCart();

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const {
    data: product,
    isLoading: productLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      try {
        return await productRepository.getProductById(productId);
      } catch (e) {
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

  const unavailable = product !== null && product !== undefined && !product.isAvailable;
  const variants = useMemo(() => variantsQuery.data ?? [], [variantsQuery.data]);
  const addOns = useMemo(() => addOnsQuery.data ?? [], [addOnsQuery.data]);
  const availableVariants = useMemo(
    () => variants.filter((v) => v.isAvailable),
    [variants],
  );

  const selectedVariant = useMemo(() => {
    if (availableVariants.length === 0) return null;
    const pick = availableVariants.find((v) => v.id === selectedVariantId);
    return pick ?? availableVariants[0];
  }, [availableVariants, selectedVariantId]);

  const selectedAddOns = useMemo(
    () => addOns.filter((a) => selectedAddOnIds.includes(a.id)),
    [addOns, selectedAddOnIds],
  );

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const base = selectedVariant ? selectedVariant.price : product.price;
    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
    return base + addOnsTotal;
  }, [product, selectedVariant, selectedAddOns]);

  const totalPrice = unitPrice * quantity;

  const handleShare = () => {
    if (!product) return;
    Share.share({
      message: `${product.name} — ${formatCurrency(product.price)} على سريع!`,
    }).catch(() => {});
  };

  const handleAddToCart = async () => {
    if (!product || !store) return;
    if (unavailable || !storeIsOpen) return;
    if (availableVariants.length > 0 && !selectedVariant) return;

    setIsAdding(true);
    try {
      const cartItem: CartItem = {
        id: generateCartItemId(
          product.id,
          selectedVariant?.id ?? null,
          selectedAddOnIds,
        ),
        productId: product.id,
        productName: product.name,
        variantId: selectedVariant?.id ?? null,
        variantName: selectedVariant?.name ?? null,
        baseUnitPrice: selectedVariant ? selectedVariant.price : product.price,
        addonIds: selectedAddOnIds.slice().sort(),
        selectedAddOns: selectedAddOns.map((a) => ({
          addonId: a.id,
          name: a.name,
          unitPrice: a.price,
        })),
        quantity,
        productImageUrl: product.imageUrl,
      };

      addItemWithConflictCheck({
        item: cartItem,
        storeId: store.id,
        storeName: store.name,
      });
      router.back();
    } finally {
      setIsAdding(false);
    }
  };

  if (productLoading) {
    return (
      <AppScreen>
        <BrandHeader title="جاري التحميل…" onBack={() => router.back()} />
        <LoadingState />
      </AppScreen>
    );
  }

  if (isError || !product) {
    return (
      <AppScreen>
        <BrandHeader title="المنتج غير متاح" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="🍽️"
            title="المنتج غير متاح"
            message="يبدو أن هذا الصنف غير متوفر حالياً في قائمة المتجر."
            action={
              <PrimaryButton
                title="الرجوع للقائمة"
                icon="arrow-back"
                onPress={() => router.back()}
              />
            }
          />
        </View>
      </AppScreen>
    );
  }

  const hasVariants = availableVariants.length > 0;
  const availableAddOns = addOns.filter((a) => a.isAvailable);

  return (
    <AppScreen>
      <BrandHeader
        title={store?.name ?? 'تفاصيل المنتج'}
        subtitle={product.name}
        onBack={() => router.back()}
        trailing={
          <View style={styles.headerActions}>
            <View style={styles.favBtnWrap}>
              <FavoriteButton kind="product" targetId={product.id} activeColor={colors.primary} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مشاركة المنتج"
              onPress={handleShare}
              hitSlop={8}
              style={({ pressed }) => [
                styles.shareBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
            >
              <Icon name="Share2" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product Hero Image */}
        {product.imageUrl ? (
          <Image source={{ uri: product.imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: colors.muted }]}>
            <Icon name="Utensils" size={54} color={colors.mutedForeground} />
          </View>
        )}

        {/* Product Info Card */}
        <Surface style={styles.infoCard}>
          <Text
            style={[
              styles.productTitle,
              { color: colors.foreground, fontFamily: theme.typography.headingMedium.fontFamily },
            ]}
          >
            {product.name}
          </Text>

          {product.description ? (
            <Text style={[styles.productDescription, { color: colors.mutedForeground }]}>
              {product.description}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={[styles.productPrice, { color: colors.foreground }]}>
              {formatCurrency(unitPrice)}
            </Text>
            {unavailable && (
              <View style={[styles.unavailableBadge, { backgroundColor: colors.destructive + '15' }]}>
                <Text style={[styles.unavailableText, { color: colors.destructive }]}>
                  غير متوفر حالياً
                </Text>
              </View>
            )}
          </View>
        </Surface>

        {/* Variants Selection (e.g. Sizes) */}
        {hasVariants && (
          <Surface style={styles.optionsCard}>
            <SectionTitle title="الحجم / الخيارات" />
            <View style={styles.optionsList}>
              {availableVariants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;
                return (
                  <Pressable
                    key={variant.id}
                    onPress={() => setSelectedVariantId(variant.id)}
                    style={({ pressed }) => [
                      styles.optionRow,
                      { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <View style={styles.optionCheckRow}>
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected ? colors.primary : colors.mutedForeground,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text
                        style={[
                          styles.optionName,
                          {
                            color: colors.foreground,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {variant.name}
                      </Text>
                    </View>
                    <Text style={[styles.optionPrice, { color: colors.foreground }]}>
                      {formatCurrency(variant.price)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Surface>
        )}

        {/* Add-ons Selection */}
        {availableAddOns.length > 0 && (
          <Surface style={styles.optionsCard}>
            <SectionTitle title="الإضافات الاختيارية" />
            <View style={styles.optionsList}>
              {availableAddOns.map((addOn) => {
                const isChecked = selectedAddOnIds.includes(addOn.id);
                return (
                  <Pressable
                    key={addOn.id}
                    onPress={() => {
                      setSelectedAddOnIds((prev) =>
                        isChecked ? prev.filter((id) => id !== addOn.id) : [...prev, addOn.id],
                      );
                    }}
                    style={({ pressed }) => [
                      styles.optionRow,
                      { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <View style={styles.optionCheckRow}>
                      <View
                        style={[
                          styles.checkboxBox,
                          {
                            borderColor: isChecked ? colors.primary : colors.border,
                            backgroundColor: isChecked ? colors.primary : colors.card,
                          },
                        ]}
                      >
                        {isChecked && (
                          <Icon name="Check" size={14} color={colors.primaryForeground} strokeWidth={3} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.optionName,
                          {
                            color: colors.foreground,
                            fontWeight: isChecked ? '700' : '500',
                          },
                        ]}
                      >
                        {addOn.name}
                      </Text>
                    </View>
                    <Text style={[styles.optionPrice, { color: colors.mutedForeground }]}>
                      + {formatCurrency(addOn.price)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Surface>
        )}

        {/* Quantity Stepper */}
        <Surface style={styles.quantityCard}>
          <Text style={[styles.quantityTitle, { color: colors.foreground }]}>الكمية</Text>
          <View style={styles.quantityControls}>
            <Pressable
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              hitSlop={8}
              style={({ pressed }) => [
                styles.stepBtn,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  opacity: quantity <= 1 ? 0.4 : pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <Icon name="Minus" size={18} color={colors.foreground} />
            </Pressable>

            <Text style={[styles.quantityNumber, { color: colors.foreground }]}>
              {quantity}
            </Text>

            <Pressable
              onPress={() => setQuantity((q) => q + 1)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.stepBtn,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  opacity: pressed ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <Icon name="Plus" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </Surface>

        {/* Add to Cart CTA */}
        <View style={styles.ctaWrapper}>
          <PrimaryButton
            title={
              unavailable
                ? 'المنتج غير متاح حالياً'
                : !storeIsOpen
                ? 'المتجر مغلق حالياً'
                : `أضف إلى السلة · ${formatCurrency(totalPrice)}`
            }
            icon="bag"
            disabled={unavailable || !storeIsOpen}
            loading={isAdding}
            onPress={() => void handleAddToCart()}
          />
        </View>
      </ScrollView>

      {/* Cross-store conflict modal */}
      <StoreConflictModal />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  headerActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  favBtnWrap: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: 230,
    borderRadius: 24,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    padding: 18,
    borderRadius: 22,
    gap: 8,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
  },
  productDescription: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '800',
  },
  unavailableBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  unavailableText: {
    fontSize: 11,
    fontWeight: '700',
  },
  optionsCard: {
    padding: 16,
    borderRadius: 22,
    gap: 10,
  },
  optionsList: {
    gap: 2,
  },
  optionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionCheckRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a1915',
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionName: {
    fontSize: 14,
  },
  optionPrice: {
    fontSize: 13,
    fontWeight: '600',
  },
  quantityCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
  },
  quantityTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  quantityControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityNumber: {
    fontSize: 17,
    fontWeight: '800',
    minWidth: 24,
    textAlign: 'center',
  },
  ctaWrapper: {
    marginTop: 6,
    marginBottom: 20,
  },
});
