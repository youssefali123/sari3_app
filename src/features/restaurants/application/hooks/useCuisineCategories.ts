import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StoreType } from '../../domain/entities/Store';
import { StoreRepository } from '../../domain/repositories/StoreRepository';
import { SupabaseStoreRepository } from '../../infrastructure/SupabaseStoreRepository';

const storeRepository: StoreRepository = new SupabaseStoreRepository();

export interface UseCuisineCategoriesOptions {
  type?: StoreType;
  areaId?: string;
  departmentId?: string;
  initialCategoryId?: string | null;
}

export function useCuisineCategories(options: UseCuisineCategoriesOptions = {}) {
  const { type = 'restaurant', areaId, departmentId, initialCategoryId = null } = options;
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategoryId);

  // 1. Query active visual categories scoped by area and department/type
  const categoriesQuery = useQuery({
    queryKey: ['cuisineCategories', type, areaId, departmentId],
    queryFn: () => storeRepository.getCuisineCategories(type, areaId, departmentId),
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  const categories = useMemo(
    () => categoriesQuery.data ?? [],
    [categoriesQuery.data],
  );

  const effectiveCategoryId = useMemo(() => {
    if (!selectedCategoryId || categories.length === 0) return selectedCategoryId;
    return categories.some((c) => c.id === selectedCategoryId) ? selectedCategoryId : null;
  }, [categories, selectedCategoryId]);

  // 2. Query stores filtered by selected category if one is active
  const filteredStoresQuery = useQuery({
    queryKey: ['stores', 'byCategory', effectiveCategoryId, areaId],
    queryFn: () => {
      if (!effectiveCategoryId) return Promise.resolve([]);
      return storeRepository.getStoresByCuisineCategory(effectiveCategoryId, areaId);
    },
    enabled: Boolean(effectiveCategoryId),
  });

  const selectedCategory = useMemo(
    () => (effectiveCategoryId ? categories.find((c) => c.id === effectiveCategoryId) ?? null : null),
    [categories, effectiveCategoryId],
  );

  const selectCategory = (categoryId: string | null) => {
    setSelectedCategoryId((current) => (current === categoryId ? null : categoryId));
  };

  const clearSelection = () => {
    setSelectedCategoryId(null);
  };

  return {
    categories,
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    refetch: categoriesQuery.refetch,
    selectedCategoryId,
    selectedCategory,
    selectCategory,
    clearSelection,
    filteredStores: filteredStoresQuery.data ?? null,
    isFilteringStores: Boolean(selectedCategoryId),
    isLoadingFilteredStores: filteredStoresQuery.isLoading,
  };
}
