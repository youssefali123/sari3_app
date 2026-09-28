import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAreas } from '@/features/areas/application/hooks/useAreas';
import { useSelectedArea } from '@/features/areas/application/hooks/useSelectedArea';
import { AreaHeaderChip } from '@/features/areas/presentation/AreaHeaderChip';
import { AreaPickerModal } from '@/features/areas/presentation/AreaPickerModal';
import { AreaEmptyState } from '@/features/areas/presentation/AreaEmptyState';
import { useSearch } from '@/features/search/application/hooks/useSearch';
import { SearchBar } from '@/features/search/presentation/SearchBar';
import { SearchResultsList } from '@/features/search/presentation/SearchResultsList';
import { useRouter } from 'expo-router';
import { StoreType } from '@/features/restaurants/domain/entities/Store';
import { StoreRepository } from '@/features/restaurants/domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '@/features/restaurants/infrastructure/SupabaseStoreRepository';
import { StoreCard } from '@/features/restaurants/presentation/StoreCard';
import { PromoBannerCarousel } from '@/features/promotions/presentation/PromoBannerCarousel';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
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
  const [pickerVisible, setPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedAreaId, selectedAreaName, setSelectedArea } = useSelectedArea();
  const { areas, isLoading: areasLoading } = useAreas();

  const search = useSearch(selectedAreaId, searchQuery);
  const isSearchMode = search.isSearchActive;

  const {
    data: stores,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['stores', 'home', selectedAreaId, typeFilter],
    queryFn: () => storeRepository.getStores(typeFilter === 'all' ? undefined : typeFilter, selectedAreaId ?? undefined),
  });

  const filteredStores = useMemo(() => {
    if (!stores) return [];
    if (typeFilter === 'all') return stores;
    return stores.filter((s) => s.type === typeFilter);
  }, [stores, typeFilter]);

  if (!isSearchMode && isLoading) {
    return <LoadingSpinner />;
  }

  if (!isSearchMode && isError) {
    return <ErrorView message="Could not load stores." onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={isSearchMode ? [] : filteredStores}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Regional browsing (feature 006): active-area chip + picker */}
            <AreaHeaderChip
              selectedAreaName={selectedAreaName}
              onPress={() => setPickerVisible(true)}
            />
            {/* Unified catalog search (feature 008) */}
            <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

            {search.isIdle ? (
              <>
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
              </>
            ) : null}
          </View>
        }
        renderItem={({ item }) =>
          isSearchMode ? null : (
            <StoreCard
              store={item}
              onPress={() => router.push(`/(customer)/(home)/store/${item.id}`)}
            />
          )
        }
        ListEmptyComponent={
          isSearchMode ? (
            <SearchResultsList
              query={searchQuery}
              areaName={selectedAreaName}
              results={search.results}
              isLoading={search.isLoading}
              isError={search.isError}
              onRetry={() => void search.refetch()}
              onSelectStore={(storeId) =>
                router.push(`/(customer)/(home)/store/${storeId}`)
              }
              onSelectProduct={(productId) => router.push(`/product/${productId}`)}
            />
          ) : (
            <AreaEmptyState
              areaName={selectedAreaName}
              onSwitchArea={() => setPickerVisible(true)}
            />
          )
        }
        contentContainerStyle={styles.listContent}
      />
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
