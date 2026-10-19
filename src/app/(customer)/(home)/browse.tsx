import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';

import { useSelectedArea } from '@/features/areas/application/hooks/useSelectedArea';
import { StoreType } from '@/features/restaurants/domain/entities/Store';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
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
    emptyTitle: 'لا توجد ماركت بعد',
    emptyMessage: 'لم نجد ماركت في منطقتك الحالية. جرّب تغيير المنطقة أو عد لاحقاً.',
    countSuffix: 'متجر',
  },
} as const;

/**
 * Category browse screen (مطاعم / ماركت) — dedicated full-screen listing.
 * Uses the full StoreCard in a single-column list for richer store details,
 * matching the old system's pattern while keeping the new design identity.
 */
export default function BrowseScreen() {
  const router = useAppRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ type?: string }>();
  const storeType: StoreType = params.type === 'market' ? 'market' : 'restaurant';
  const copy = COPY[storeType];

  const { selectedAreaId } = useSelectedArea();

  const {
    data: stores,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['stores', 'browse', storeType, selectedAreaId],
    queryFn: () => storeRepository.getStores(storeType, selectedAreaId ?? undefined),
  });

  const sortedStores = useMemo(() => {
    if (!stores) return [];
    return [...stores].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }, [stores]);

  const countLabel =
    !isLoading && !isError && sortedStores.length > 0
      ? `${sortedStores.length} ${copy.countSuffix}`
      : undefined;

  return (
    <AppScreen>
      <BrandHeader
        title={copy.title}
        subtitle={countLabel ?? copy.subtitle}
        onBack={() => router.back()}
      />

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard key={i} style={styles.skeleton} />
          ))}
        </View>
      ) : isError ? (
        <ErrorState
          title="تعذر التحميل"
          message={`حدث خطأ أثناء جلب ${copy.title}. حاول مرة أخرى.`}
          onRetry={() => void refetch()}
        />
      ) : sortedStores.length === 0 ? (
        <EmptyState
          emoji={storeType === 'market' ? '🧺' : '🍽️'}
          title={copy.emptyTitle}
          message={copy.emptyMessage}
          action={
            <Button
              label="العودة للرئيسية"
              variant="outlined"
              onPress={() => router.push('/(customer)/(home)')}
            />
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
              onPress={() => router.push(`/store/${item.id}`)}
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
