import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';

import { useAreas } from '@/features/areas/application/hooks/useAreas';
import { useSelectedArea } from '@/features/areas/application/hooks/useSelectedArea';
import { AreaPickerModal } from '@/features/areas/presentation/AreaPickerModal';
import { AreaEmptyState } from '@/features/areas/presentation/AreaEmptyState';
import { useSearch } from '@/features/search/application/hooks/useSearch';
import { SearchBar } from '@/features/search/presentation/SearchBar';
import { SearchResultsList } from '@/features/search/presentation/SearchResultsList';
import { Store } from '@/features/restaurants/domain/entities/Store';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { PopularStoreCard } from '@/features/restaurants/presentation/PopularStoreCard';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { useCuisineCategories } from '@/features/restaurants/application/hooks/useCuisineCategories';
import { CuisineCarousel } from '@/features/restaurants/presentation/components/CuisineCarousel';
import { HomeDepartmentsGrid } from '@/features/departments/presentation/components/HomeDepartmentsGrid';
import { PromotionRepository } from '@/features/promotions/domain/repositories/PromotionRepository';
import { SupabasePromotionRepository } from '@/features/promotions/infrastructure/SupabasePromotionRepository';
import { OrderRepository } from '@/features/orders/domain/repositories/OrderRepository';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';
import { useReorder } from '@/features/orders/application/hooks/useReorder';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { Button } from '@/shared/ui/components/Button';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { ErrorState } from '@/shared/ui/components/ErrorState';
import { AppLogo } from '@/shared/ui/components/AppLogo';
import { SectionTitle, Surface } from '@/shared/ui/components/AppUI';
import { SkeletonCard } from '@/shared/ui/motion';
import { useCurrentCustomerId } from '@/shared/lib/auth';

const storeRepository: StoreRepository = new SupabaseStoreRepository();
const promotionRepository: PromotionRepository = new SupabasePromotionRepository();
const orderRepository: OrderRepository = new SupabaseOrderRepository();

const HERO_BANNER = require('../../../../assets/avatar_home_screen.jpeg');

function greetingForHour(hour: number): string {
  if (hour < 12) return 'صباح الخير';
  if (hour < 17) return 'مساء الخير';
  return 'مساء الخير';
}

export default function HomeScreen() {
  const router = useAppRouter();
  const { theme } = useTheme();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const reorder = useReorder();

  const { selectedAreaId, selectedAreaName, setSelectedArea } = useSelectedArea();
  const { areas, isLoading: areasLoading } = useAreas();

  const search = useSearch(selectedAreaId, searchQuery);
  const isSearchOpen = isSearchActive || searchQuery.trim().length > 0;

  const handleCloseSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearchActive(false);
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const onBackPress = () => {
      handleCloseSearch();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isSearchOpen, handleCloseSearch]);

  const {
    data: stores,
    isLoading: storesLoading,
    isError: storesError,
    refetch: refetchStores,
  } = useQuery({
    queryKey: ['stores', 'home', selectedAreaId],
    queryFn: () => storeRepository.getStores(undefined, selectedAreaId ?? undefined),
  });

  const {
    categories: cuisineCategories,
    isLoading: isCuisinesLoading,
    selectedCategoryId,
    selectedCategory,
    selectCategory,
    filteredStores: categoryFilteredStores,
    isFilteringStores,
    isLoadingFilteredStores,
  } = useCuisineCategories({
    type: 'restaurant',
    areaId: selectedAreaId ?? undefined,
  });

  const { data: promotions } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: () => promotionRepository.getActivePromotions(),
  });

  const customerId = useCurrentCustomerId();
  const { data: orders } = useQuery({
    queryKey: ['orders', customerId],
    queryFn: () => orderRepository.getCustomerOrders(customerId!),
    enabled: Boolean(customerId),
  });

  const lastOrder = useMemo(() => {
    if (!orders?.length) return null;
    const visible = orders.filter((o) => !o.customerHiddenAt);
    if (!visible.length) return null;
    return visible.reduce((latest, o) => (o.createdAt > latest.createdAt ? o : latest));
  }, [orders]);

  const filteredStores = useMemo(() => {
    if (isFilteringStores) {
      return categoryFilteredStores ?? [];
    }
    return stores ?? [];
  }, [isFilteringStores, categoryFilteredStores, stores]);

  const popularStores = useMemo(() => {
    if (!stores) return [];
    return [...stores]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 10);
  }, [stores]);

  const firstName = profile?.fullName?.trim().split(/\s+/)[0];
  const greetingName = user && firstName ? firstName : '';
  const greeting = greetingForHour(new Date().getHours());

  const openStore = useCallback(
    (storeId: string) => router.push(`/store/${storeId}`),
    [router],
  );

  const renderStoreItem = useCallback(
    ({ item }: { item: Store }) => (
      <StoreCard store={item} onPress={() => openStore(item.id)} />
    ),
    [openStore],
  );

  const storeKeyExtractor = useCallback((item: Store) => item.id, []);

  // ── Brand Header (Matching SOURCE) ──────────────────────────────────────────

  const brandHeader = (
    <View style={[styles.brandHeader, { paddingTop: insets.top + 4 }]}>
      {/* Right side (RTL Start): Location selector */}
      <Pressable
        onPress={() => setPickerVisible(true)}
        style={({ pressed }) => [
          styles.headerLocationWrap,
          { opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`التوصيل إلى: ${selectedAreaName ?? 'اختر المنطقة'}`}
      >
        <View style={[styles.headerLocationIconBox, { backgroundColor: colors.secondary }]}>
          <Icon name="MapPin" size={18} color={colors.secondaryForeground} />
        </View>
        <View style={styles.headerLocationCopy}>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
            التوصيل إلى
          </Text>
          <View style={styles.headerTitleLine}>
            <Text
              style={[
                styles.headerTitle,
                { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
              ]}
              numberOfLines={1}
            >
              {selectedAreaName ?? 'اختر المنطقة'}
            </Text>
            <Icon name="ChevronDown" size={14} color={colors.foreground} />
          </View>
        </View>
      </Pressable>

      {/* Left side (RTL End): Notification bell and app logo brand */}
      <View style={styles.headerLeftActions}>
        <AppLogo size={38} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الإشعارات"
          onPress={() => Alert.alert('الإشعارات', 'لا توجد إشعارات جديدة حالياً.')}
          hitSlop={8}
          style={({ pressed }) => [
            styles.headerIconButton,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.75 : 1,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Icon name="Bell" size={20} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeaderContainer}>
        {/* Hero banner with scooter art and greeting badge */}
        <View style={styles.banner}>
          <Image
            source={HERO_BANNER}
            style={styles.bannerImage}
            contentFit="contain"
            transition={null}
          />
          <View style={styles.bannerShade} />
          <View style={styles.bannerText}>
            <Text
              style={[
                styles.bannerGreeting,
                { fontFamily: theme.typography.label.fontFamily },
              ]}
            >
              {greeting}{greetingName ? `، ${greetingName}` : ''}
            </Text>
            <Text
              style={[
                styles.bannerTitle,
                { fontFamily: theme.typography.headingLarge.fontFamily },
              ]}
            >
              ماذا تريد اليوم؟
            </Text>
            <View style={styles.bannerBadge}>
              <Icon name="Clock" size={13} color="#191816" />
              <Text style={styles.bannerBadgeText}>توصيل سريع لباب بيتك</Text>
            </View>
          </View>
        </View>

        {/* Dynamic Departments Grid (Feature 014) */}
        <HomeDepartmentsGrid />

        {/* Search Bar Entry Trigger */}
        <Pressable
          onPress={() => setIsSearchActive(true)}
          accessibilityRole="button"
          accessibilityLabel="البحث عن مطعم أو وجبة"
          unstable_pressDelay={0}
        >
          <View pointerEvents="none">
            <SearchBar
              value=""
              onChangeText={() => {}}
              placeholder="ابحث عن مطعم أو وجبة..."
            />
          </View>
        </Pressable>

        {/* Promo banner strip */}
        <Surface style={styles.promoStrip}>
          <View style={[styles.promoIcon, { backgroundColor: colors.primary }]}>
            <Icon name="Tag" size={20} color={colors.primaryForeground} />
          </View>
          <View style={styles.promoCopy}>
            <Text
              style={[
                styles.promoTitle,
                { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
              ]}
            >
              عروض وخصومات
            </Text>
            <Text
              style={[
                styles.smallText,
                { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
              ]}
            >
              {promotions?.length
                ? `${promotions[0].title} — استفد الآن`
                : 'تابع جديد عروضنا وتخفيضاتنا الحصرية'}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (promotions && promotions.length > 0) {
                router.push(`/(customer)/(home)/promotion/${promotions[0].id}`);
              }
            }}
          >
            <Icon name="ArrowLeftCircle" size={28} color={colors.primary} />
          </Pressable>
        </Surface>

        {/* Top rated carousel */}
        {popularStores.length > 0 ? (
          <View style={styles.sectionWrap}>
            <SectionTitle
              title="الأكثر طلباً"
              action="عرض الكل"
              onAction={() =>
                router.push({
                  pathname: '/(customer)/(home)/browse',
                  params: { type: 'restaurant' },
                })
              }
            />
            <FlatList
              horizontal
              inverted
              data={popularStores}
              keyExtractor={(store) => store.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularCarouselContent}
              ItemSeparatorComponent={() => <View style={styles.carouselGap} />}
              renderItem={({ item: store }) => (
                <PopularStoreCard
                  store={store}
                  onPress={() => openStore(store.id)}
                />
              )}
            />
          </View>
        ) : null}

        {/* Visual Cuisines Carousel */}
        <CuisineCarousel
          categories={cuisineCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={selectCategory}
          isLoading={isCuisinesLoading}
        />

        {/* Filtered Store List Section Title */}
        <View style={styles.sectionWrap}>
          <SectionTitle
            title={
              selectedCategory
                ? `مطاعم ${selectedCategory.name}`
                : 'كل المتاجر القريبة منك'
            }
            action={selectedCategoryId ? 'عرض الكل' : undefined}
            onAction={selectedCategoryId ? () => selectCategory(null) : undefined}
          />
          {storesLoading || (isFilteringStores && isLoadingFilteredStores) ? (
            <View style={styles.listGap}>
              {[0, 1, 2].map((i) => (
                <SkeletonCard
                  key={i}
                  style={{ height: 112, borderRadius: 20 }}
                />
              ))}
            </View>
          ) : storesError ? (
            <ErrorState
              title="تعذر تحميل المتاجر"
              message="حدث خطأ أثناء جلب المتاجر. حاول مرة أخرى."
              onRetry={() => void refetchStores()}
            />
          ) : null}
        </View>
      </View>
    ),
    [
      theme,
      greeting,
      greetingName,
      colors,
      router,
      promotions,
      popularStores,
      cuisineCategories,
      selectedCategoryId,
      selectedCategory,
      selectCategory,
      isCuisinesLoading,
      isFilteringStores,
      isLoadingFilteredStores,
      storesLoading,
      storesError,
      openStore,
      refetchStores,
    ],
  );

  const listEmpty = useMemo(() => {
    if (storesLoading || storesError || (isFilteringStores && isLoadingFilteredStores)) return null;

    if (isFilteringStores && filteredStores.length === 0) {
      return (
        <EmptyState
          title="لا توجد نتائج"
          message={`لم نجد مطاعم تقدم ${selectedCategory?.name ?? 'هذا التصنيف'} في منطقتك حالياً.`}
          action={
            <Button
              label="عرض كل المطاعم"
              variant="primary"
              onPress={() => selectCategory(null)}
            />
          }
        />
      );
    }

    return (
      <EmptyState
        title="لا توجد متاجر"
        message={
          selectedAreaId
            ? 'لا توجد متاجر مطابقة في منطقتك الحالية.'
            : 'اختر منطقتك لتظهر لك المتاجر القريبة.'
        }
        action={
          <Button
            label="اختيار المنطقة"
            variant="primary"
            onPress={() => setPickerVisible(true)}
          />
        }
      />
    );
  }, [
    storesLoading,
    storesError,
    isFilteringStores,
    isLoadingFilteredStores,
    filteredStores.length,
    selectedCategory,
    selectedAreaId,
    selectCategory,
  ]);

  const listFooter = useMemo(
    () => (
      <View style={styles.listFooterContainer}>
        {/* Last order reorder card */}
        {user && lastOrder ? (
          <Surface style={styles.lastOrderCard}>
            <View style={styles.lastOrderHeading}>
              <View style={[styles.lastOrderIcon, { backgroundColor: colors.secondary }]}>
                <Icon name="ShoppingBag" size={20} color={colors.secondaryForeground} />
              </View>
              <View style={styles.lastOrderCopy}>
                <Text
                  style={[
                    styles.lastOrderStore,
                    { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
                  ]}
                >
                  آخر طلب من {lastOrder.storeName}
                </Text>
                <Text
                  style={[
                    styles.smallText,
                    { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
                  ]}
                >
                  {lastOrder.items.length} منتجات
                </Text>
              </View>
            </View>
            <Button
              label="اطلب مرة أخرى"
              variant="primary"
              onPress={() => void reorder(lastOrder)}
            />
          </Surface>
        ) : null}

        {!selectedAreaId && stores && stores.length === 0 && !storesLoading ? (
          <AreaEmptyState
            areaName={selectedAreaName}
            onSwitchArea={() => setPickerVisible(true)}
          />
        ) : null}
      </View>
    ),
    [
      user,
      lastOrder,
      colors,
      theme,
      reorder,
      selectedAreaId,
      stores,
      storesLoading,
      selectedAreaName,
    ],
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isSearchOpen ? (
        <View style={styles.searchActiveScreen}>
          {/* Sticky Search Header with RTL Back button */}
          <View style={[styles.searchActiveHeader, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={handleCloseSearch}
              hitSlop={8}
              style={({ pressed }) => [
                styles.searchBackBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="إغلاق البحث والعودة"
            >
              <Icon name="ArrowRight" size={20} color={colors.foreground} />
            </Pressable>

            <View style={styles.searchBarActiveWrap}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                placeholder="ابحث عن مطعم، كافيه، أو وجبة..."
                containerStyle={styles.searchBarActiveInput}
              />
            </View>
          </View>

          {/* Search Content */}
          <View style={styles.searchResultsWrap}>
            <SearchResultsList
              query={searchQuery}
              areaName={selectedAreaName}
              results={search.results}
              isLoading={search.isLoading}
              isError={search.isError}
              onRetry={() => void search.refetch()}
              onSelectStore={(storeId) => openStore(storeId)}
              onSelectProduct={(productId) => router.push(`/product/${productId}`)}
              onSelectSuggestion={(suggestion) => setSearchQuery(suggestion)}
            />
          </View>
        </View>
      ) : (
        <>
          {brandHeader}
          <FlatList
            style={styles.container}
            data={
              storesLoading ||
              storesError ||
              (isFilteringStores && isLoadingFilteredStores)
                ? []
                : filteredStores
            }
            renderItem={renderStoreItem}
            keyExtractor={storeKeyExtractor}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={listEmpty}
            ListFooterComponent={listFooter}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshing={false}
            onRefresh={refetchStores}
          />
        </>
      )}

      <AreaPickerModal
        visible={pickerVisible}
        areas={areas}
        isLoading={areasLoading}
        selectedAreaId={selectedAreaId}
        onSelect={(area) => {
          void setSelectedArea(area);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandHeader: {
    minHeight: 60,
    paddingHorizontal: 18,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLocationWrap: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerLocationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLocationCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  headerSubtitle: {
    fontSize: 11,
    textAlign: 'right',
  },
  headerTitleLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  headerLeftActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 112,
    gap: 18,
  },
  listHeaderContainer: {
    gap: 18,
  },
  listFooterContainer: {
    gap: 18,
    marginTop: 4,
  },
  searchActiveScreen: {
    flex: 1,
  },
  searchActiveHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  searchBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarActiveWrap: {
    flex: 1,
  },
  searchBarActiveInput: {
    marginBottom: 0,
  },
  searchResultsWrap: {
    flex: 1,
  },
  banner: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: '#f5bd16',
    position: 'relative',
  },
  bannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  bannerShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(245, 189, 22, 0.15)',
  },
  bannerText: {
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    gap: 7,
  },
  bannerGreeting: {
    color: '#191816',
    fontSize: 15,
    fontWeight: '500',
  },
  bannerTitle: {
    color: '#191816',
    fontSize: 23,
    fontWeight: '800',
  },
  bannerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 30,
  },
  bannerBadgeText: {
    color: '#191816',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  categoryTile: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 20,
    padding: 11,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 9,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  smallText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'right',
  },
  promoStrip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    backgroundColor: '#fff5da',
    borderColor: '#fff0c4',
    borderRadius: 20,
    borderWidth: 1,
  },
  promoIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  promoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  sectionWrap: {
    gap: 12,
  },
  carouselContainer: {
    flexDirection: 'row-reverse',
    gap: 12,
    paddingVertical: 4,
  },
  popularCarouselContent: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  carouselGap: {
    width: 12,
  },
  listGap: {
    gap: 11,
  },
  lastOrderCard: {
    gap: 12,
    padding: 16,
    borderRadius: 20,
  },
  lastOrderHeading: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  lastOrderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastOrderCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  lastOrderStore: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
});
