import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';

import { useSelectedArea } from '@/features/areas/application/hooks/useSelectedArea';
import { useCuisineCategories } from '@/features/restaurants/application/hooks/useCuisineCategories';
import { StoreType } from '@/features/restaurants/domain/entities/Store';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { CuisineCarousel } from '@/features/restaurants/presentation/components/CuisineCarousel';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { AppScreen, BrandHeader } from '@/shared/ui/components/AppUI';
import { Button } from '@/shared/ui/components/Button';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { ErrorState } from '@/shared/ui/components/ErrorState';
import { SkeletonCard } from '@/shared/ui/motion';

const storeRepository: StoreRepository = new SupabaseStoreRepository();

const COPY = {
  restaurant: {
    title: 'مطاعم',
    subtitle: 'اطلب من أفضل المطاعم',
    emptyTitle: 'لا توجد مطاعم بعد',
    emptyMessage: 'لم نجد مطاعم في منطقتك الحالية. جرّب تغيير المنطقة أو عد لاحقاً.',
    countSuffix: 'مطعم',
  },
  market: {
    title: 'ماركت',
    subtitle: 'كل احتياجاتك اليومية',
    emptyTitle: 'لا توجد متاجر بعد',
    emptyMessage: 'لم نجد متاجر في منطقتك الحالية. جرّب تغيير المنطقة أو عد لاحقاً.',
    countSuffix: 'متجر',
  },
} as const;

/**
 * Category browse screen — dedicated full-screen listing.
 * Supports dynamic department browsing (departmentId / departmentName)
 * as well as legacy type parameter ('restaurant' / 'market').
 */
export default function BrowseScreen() {
  const router = useAppRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{
    type?: string;
    categoryId?: string;
    departmentId?: string;
    departmentName?: string;
  }>();

  const storeType: StoreType = params.type === 'market' ? 'market' : 'restaurant';
  const legacyCopy = COPY[storeType];

  const title = params.departmentName ?? legacyCopy.title;
  const countSuffix = params.departmentId ? 'متجر' : legacyCopy.countSuffix;

  const { selectedAreaId } = useSelectedArea();

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
    type: params.departmentId ? undefined : storeType,
    departmentId: params.departmentId ?? undefined,
    areaId: selectedAreaId ?? undefined,
    initialCategoryId: params.categoryId ?? null,
  });

  const {
    data: stores,
    isLoading: isStoresLoading,
    isError: isStoresError,
    refetch,
  } = useQuery({
    queryKey: ['stores', 'browse', params.departmentId ?? storeType, selectedAreaId],
    queryFn: () =>
      storeRepository.getStores(
        params.departmentId ? undefined : storeType,
        selectedAreaId ?? undefined,
        params.departmentId ?? undefined
      ),
  });

  const activeStores = useMemo(() => {
    if (isFilteringStores) {
      const filtered = categoryFilteredStores ?? [];
      if (params.departmentId) {
        return filtered.filter((s) => s.departmentId === params.departmentId);
      }
      return filtered;
    }
    return stores ?? [];
  }, [isFilteringStores, categoryFilteredStores, stores, params.departmentId]);

  const sortedStores = useMemo(() => {
    return [...activeStores].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }, [activeStores]);

  const isLoading = isStoresLoading || (isFilteringStores && isLoadingFilteredStores);
  const isError = isStoresError;

  const countLabel =
    !isLoading && !isError && sortedStores.length > 0
      ? `${sortedStores.length} ${countSuffix}`
      : undefined;

  const subtitle = selectedCategory
    ? countLabel
      ? `${selectedCategory.name} • ${countLabel}`
      : selectedCategory.name
    : (countLabel ?? (params.departmentName ? `اطلب من أفضل ${title}` : legacyCopy.subtitle));

  const emptyTitle = isFilteringStores && selectedCategory
    ? `لا توجد نتائج في تصنيف ${selectedCategory.name}`
    : params.departmentName
      ? `لا توجد متاجر في قسم ${params.departmentName} حالياً`
      : legacyCopy.emptyTitle;

  const emptyMessage = isFilteringStores
    ? 'لم نجد متاجر مطابقة لهذا التصنيف في منطقتك حالياً. يمكنك تصفح كافة المتاجر أو اختيار تصنيف آخر.'
    : params.departmentName
      ? `لم نجد متاجر في قسم ${params.departmentName} بمنطقتك الحالية. جرّب تغيير المنطقة أو عد لاحقاً.`
      : legacyCopy.emptyMessage;

  return (
    <AppScreen>
      <BrandHeader
        title={title}
        subtitle={subtitle}
        onBack={() => router.back()}
      />

      {cuisineCategories.length > 0 && (
        <View style={styles.carouselContainer}>
          <CuisineCarousel
            categories={cuisineCategories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={selectCategory}
            isLoading={isCuisinesLoading}
            showHeader={false}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState
          title="تعذر التحميل"
          message={`حدث خطأ أثناء جلب ${title}. حاول مرة أخرى.`}
          onRetry={() => void refetch()}
        />
      ) : sortedStores.length === 0 ? (
        <EmptyState
          emoji={storeType === 'market' ? '🧺' : '🍽️'}
          title={emptyTitle}
          message={emptyMessage}
          action={
            isFilteringStores ? (
              <Button
                label="عرض كل المتاجر"
                variant="outlined"
                onPress={() => selectCategory(null)}
              />
            ) : (
              <Button
                label="العودة للرئيسية"
                variant="outlined"
                onPress={() => router.push('/(customer)/(home)' as any)}
              />
            )
          }
        />
      ) : (
        <FlatList
          style={styles.container}
          data={sortedStores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={false}
          onRefresh={refetch}
          renderItem={({ item }) => (
            <StoreCard
              store={item}
              onPress={() => router.push(`/store/${item.id}` as any)}
            />
          )}
        />
      )}
    </AppScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    carouselContainer: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.background,
      paddingBottom: theme.spacing.xs,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xl + 16,
      gap: theme.spacing.sm,
    },
    skeletonList: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    skeleton: {
      height: 112,
      borderRadius: theme.radii.large,
    },
  });
