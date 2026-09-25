import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StoreType } from '@/features/restaurants/domain/entities/Store';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { PromoBannerCarousel } from '@/features/promotions/presentation/PromoBannerCarousel';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

const storeRepository: StoreRepository = new SupabaseStoreRepository();

type TypeFilter = 'all' | StoreType;

const FILTERS: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'restaurant', label: 'Restaurants' },
  { key: 'market', label: 'Markets' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const {
    data: stores,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['stores', 'home'],
    queryFn: () => storeRepository.getStores(),
  });

  const filteredStores = useMemo(() => {
    if (!stores) return [];
    if (typeFilter === 'all') return stores;
    return stores.filter((s) => s.type === typeFilter);
  }, [stores, typeFilter]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load stores." onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredStores}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Promotions carousel: renders null when there are no promotions */}
            <PromoBannerCarousel />
            <Text style={styles.title}>Browse</Text>
            <View style={styles.filterRow}>
              {FILTERS.map((filter) => (
                <Text
                  key={filter.key}
                  style={[styles.filterChip, typeFilter === filter.key && styles.filterChipActive]}
                  onPress={() => setTypeFilter(filter.key)}
                >
                  {filter.label}
                </Text>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <StoreCard
            store={item}
            onPress={() => router.push(`/(customer)/(home)/store/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No stores found"
            message="There are no stores in this category yet."
            emoji="🏪"
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
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
    fontWeight: '600',
  },
});
