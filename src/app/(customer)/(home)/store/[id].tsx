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

import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { ProductRepository } from '@/features/products/domain/repositories/ProductRepository';
import { SupabaseProductRepository } from '@/features/products/infrastructure/SupabaseProductRepository';
import { Product } from '@/features/products/domain/entities/Product';
import { ProductRow } from '@/features/products/presentation/ProductRow';
import { StoreConflictModal } from '@/features/cart/presentation/StoreConflictModal';
import { useAddToCart } from '@/features/cart/application/useAddToCart';
import {
  calculateItemTotal,
  generateCartItemId,
} from '@/features/cart/domain/cartUtils';
import { CartItem } from '@/features/cart/domain/entities/CartItem';
import { selectCartItems, selectCartStoreId } from '@/features/cart/application/cartSlice';
import { useAppSelector } from '@/shared/lib/store';
import { FavoriteButton } from '@/features/favorites/presentation/FavoriteButton';
import { useColors } from '@/shared/ui/hooks/useColors';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionTitle,
  Surface,
} from '@/shared/ui/components';
import { SkeletonStoreDetail, SkeletonItem } from '@/shared/ui/motion';
import { formatCurrency } from '@/shared/utils/formatting';

const storeRepository: StoreRepository = new SupabaseStoreRepository();
const productRepository: ProductRepository = new SupabaseProductRepository();

export default function StoreDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const storeId = id as string;
  const router = useRouter();
  const colors = useColors();
  const { theme } = useTheme();

  const { addItemWithConflictCheck } = useAddToCart();
  const cartItems = useAppSelector(selectCartItems);
  const cartStoreId = useAppSelector(selectCartStoreId);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

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
    queryKey: ['products', storeId],
    queryFn: () => productRepository.getProductsByStore(storeId),
    enabled: Boolean(storeId),
  });

  const store = storeQuery.data;
  const storeIsOpen = store?.isOpen ?? false;
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === 'all') return products;
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const cartBelongsToThisStore = cartStoreId === null || cartStoreId === storeId;
  const visibleCartItems = cartBelongsToThisStore ? cartItems : [];
  const cartCount = visibleCartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = visibleCartItems.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0,
  );

  const handleShare = () => {
    if (!store) return;
    Share.share({
      message: `${store.name} — اطلب ألذ المأكولات عبر تطبيق سريع!`,
    }).catch(() => {});
  };

  const handleQuickAdd = (product: Product) => {
    if (!store || !storeIsOpen) return;
    const cartItem: CartItem = {
      id: generateCartItemId(product.id, null, []),
      productId: product.id,
      productName: product.name,
      variantId: null,
      variantName: null,
      baseUnitPrice: product.price,
      addonIds: [],
      selectedAddOns: [],
      quantity: 1,
      productImageUrl: product.imageUrl,
    };
    addItemWithConflictCheck({
      item: cartItem,
      storeId: store.id,
      storeName: store.name,
    });
  };

  if (storeQuery.isLoading) {
    return (
      <AppScreen>
        <BrandHeader title="جاري التحميل…" onBack={() => router.back()} />
        <SkeletonStoreDetail />
      </AppScreen>
    );
  }

  if (storeQuery.isError || !store) {
    return (
      <AppScreen>
        <BrandHeader title="المتجر غير متاح" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <ErrorState
            title="تعذر تحميل المتجر"
            message="حدث خطأ أثناء جلب بيانات المتجر. حاول مرة أخرى."
            onRetry={() => void storeQuery.refetch()}
            fullPage
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BrandHeader
        title={store.name}
        subtitle={store.description || (store.type === 'restaurant' ? 'مطعم' : 'متجر')}
        onBack={() => router.back()}
        trailing={
          <View style={styles.headerActions}>
            <View style={styles.favBtnWrap}>
              <FavoriteButton kind="store" targetId={storeId} activeColor={colors.primary} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مشاركة المتجر"
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
        {/* Store Hero Image */}
        {store.imageUrl ? (
          <Image source={{ uri: store.imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder, { backgroundColor: colors.secondary }]}>
            <Icon name="ShoppingBasket" size={54} color={colors.secondaryForeground} />
          </View>
        )}

        {/* Store Info Card */}
        <Surface style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            <Text
              style={[
                styles.storeTitle,
                { color: colors.foreground, fontFamily: theme.typography.headingMedium.fontFamily },
              ]}
            >
              {store.name}
            </Text>
            {store.rating !== null && (
              <View style={[styles.ratingPill, { backgroundColor: '#fff8e6', borderColor: '#f5bd16' }]}>
                <Icon name="Star" size={13} color="#f5bd16" />
                <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {store.description ? (
            <Text style={[styles.storeDescription, { color: colors.mutedForeground }]}>
              {store.description}
            </Text>
          ) : null}

          <View style={styles.infoMetaRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: storeIsOpen ? colors.secondary : colors.destructive + '15',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: storeIsOpen ? colors.secondaryForeground : colors.destructive },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: storeIsOpen ? colors.secondaryForeground : colors.destructive },
                ]}
              >
                {storeIsOpen ? 'مفتوح للطلب الآن' : 'المتجر مغلق حالياً'}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Icon name="Clock" size={14} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                التوصيل 25 - 40 دقيقة
              </Text>
            </View>
          </View>
        </Surface>

        {/* Closed Banner Warning */}
        {!storeIsOpen && (
          <Surface style={[styles.closedWarning, { backgroundColor: colors.destructive + '10', borderColor: colors.destructive + '30' }]}>
            <Icon name="AlertCircle" size={18} color={colors.destructive} />
            <Text style={[styles.closedWarningText, { color: colors.destructive }]}>
              المتجر مغلق حالياً. يمكنك تصفح القائمة ولكن لا يمكن إتمام الطلب الآن.
            </Text>
          </Surface>
        )}

        {/* Category Filter Pills (if categories exist) */}
        {categories.length > 0 && (
          <View style={styles.categoriesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
            >
              <Pressable
                onPress={() => setSelectedCategoryId('all')}
                style={({ pressed }) => [
                  styles.categoryPill,
                  selectedCategoryId === 'all'
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.card, borderColor: colors.border },
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: selectedCategoryId === 'all' ? colors.foreground : colors.mutedForeground,
                      fontWeight: selectedCategoryId === 'all' ? '700' : '500',
                    },
                  ]}
                >
                  الكل ({products.length})
                </Text>
              </Pressable>

              {categories.map((cat) => {
                const count = products.filter((p) => p.categoryId === cat.id).length;
                const active = selectedCategoryId === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    style={({ pressed }) => [
                      styles.categoryPill,
                      active
                        ? { backgroundColor: colors.primary, borderColor: colors.primary }
                        : { backgroundColor: colors.card, borderColor: colors.border },
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        {
                          color: active ? colors.foreground : colors.mutedForeground,
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                    >
                      {cat.name} ({count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Menu Section Title */}
        <SectionTitle
          title={store.type === 'restaurant' ? 'قائمة الطعام' : 'المنتجات'}
          action={products.length > 0 ? `${filteredProducts.length} صنف` : undefined}
        />

        {/* Products List */}
        {productsQuery.isLoading ? (
          <View style={styles.productsList}>
            {[0, 1, 2, 3].map((idx) => (
              <SkeletonItem key={idx} />
            ))}
          </View>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title="لا توجد منتجات في هذا القسم"
            message="اختر قسماً آخر أو تصفح باقي الأصناف."
            emoji="🍽️"
          />
        ) : (
          <View style={styles.productsList}>
            {filteredProducts.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                onPress={() => router.push(`/product/${product.id}`)}
                onQuickAdd={storeIsOpen ? () => void handleQuickAdd(product) : undefined}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Cart Bar */}
      {cartCount > 0 && (
        <View style={styles.floatingCartWrapper}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(customer)/cart')}
            style={({ pressed }) => [
              styles.floatingCartBar,
              { backgroundColor: colors.primary, opacity: pressed ? 0.92 : 1 },
            ]}
          >
            <View style={styles.cartBadgeCircle}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
            <View style={styles.cartInfoWrap}>
              <Text style={styles.cartViewText}>عرض سلة الطلبات</Text>
              <Text style={styles.cartTotalText}>{formatCurrency(cartTotal)}</Text>
            </View>
            <Icon name="ShoppingBag" size={22} color={colors.foreground} />
          </Pressable>
        </View>
      )}

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
    paddingBottom: 130,
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
    height: 200,
    borderRadius: 22,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    padding: 16,
    borderRadius: 22,
    gap: 10,
  },
  infoTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'right',
    flex: 1,
  },
  ratingPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a6400',
  },
  storeDescription: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'right',
  },
  infoMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
  },
  closedWarning: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  closedWarningText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    textAlign: 'right',
  },
  categoriesContainer: {
    marginHorizontal: -18,
  },
  categoriesScroll: {
    paddingHorizontal: 18,
    flexDirection: 'row-reverse',
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 13,
  },
  productsList: {
    gap: 12,
  },
  floatingCartWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 18,
    right: 18,
  },
  floatingCartBar: {
    minHeight: 54,
    borderRadius: 18,
    paddingHorizontal: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  cartBadgeCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1a1915',
  },
  cartInfoWrap: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 12,
  },
  cartViewText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1915',
  },
  cartTotalText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1915',
    opacity: 0.85,
  },
});
