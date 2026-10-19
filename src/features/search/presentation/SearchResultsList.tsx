import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SearchResult } from '../domain/entities/SearchResult';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { SkeletonCard } from '@/shared/ui/motion';
import { ProductResultRow } from './ProductResultRow';
import { StoreResultRow } from './StoreResultRow';
import { SearchEmptyState } from './SearchEmptyState';

type FilterType = 'all' | 'stores' | 'products';

interface SearchResultsListProps {
  query: string;
  areaName: string | null;
  results: SearchResult[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectStore: (storeId: string) => void;
  onSelectProduct: (productId: string) => void;
  onSelectSuggestion?: (suggestion: string) => void;
}

const POPULAR_DISCOVERY_TAGS = [
  { label: 'بيتزا', emoji: '🍕' },
  { label: 'برجر', emoji: '🍔' },
  { label: 'شاورما', emoji: '🌯' },
  { label: 'كريب', emoji: '🥞' },
  { label: 'مشويات', emoji: '🥩' },
  { label: 'عصائر طازجة', emoji: '🧃' },
  { label: 'حلويات', emoji: '🍰' },
  { label: 'سوبرماركت', emoji: '🛒' },
];

/**
 * Modern Unified Search Results Container:
 * - Category filter chips ("الكل", "المتاجر", "الأصناف") with count badges
 * - Smooth skeleton loading cards
 * - Arabic error states with retry action
 * - Popular discovery tags for instant queries
 * - Full RTL layout matching Sari3 design system
 */
export function SearchResultsList({
  query,
  areaName,
  results,
  isLoading,
  isError,
  onRetry,
  onSelectStore,
  onSelectProduct,
  onSelectSuggestion,
}: SearchResultsListProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const trimmedQuery = query.trim();
  const isPreSearch = trimmedQuery.length < 2;

  const storesCount = useMemo(
    () => results.filter((item) => item.resultType === 'store').length,
    [results],
  );

  const productsCount = useMemo(
    () => results.filter((item) => item.resultType === 'product').length,
    [results],
  );

  const filteredResults = useMemo(() => {
    if (activeFilter === 'stores') {
      return results.filter((item) => item.resultType === 'store');
    }
    if (activeFilter === 'products') {
      return results.filter((item) => item.resultType === 'product');
    }
    return results;
  }, [results, activeFilter]);

  // Pre-search state (user opened search but typed < 2 characters)
  if (isPreSearch) {
    return (
      <View style={styles.preSearchContainer}>
        <View style={styles.preSearchHeader}>
          <Icon name="Compass" size={20} color={colors.primary} />
          <Text
            style={[
              styles.preSearchTitle,
              { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
            ]}
          >
            اكتشف الأصناف والمتاجر الأكثر طلباً
          </Text>
        </View>

        <Text
          style={[
            styles.preSearchSubtitle,
            { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
          ]}
        >
          اضغط على أي صنف لبدء البحث المباشر في منطقتك
        </Text>

        <View style={styles.discoveryGrid}>
          {POPULAR_DISCOVERY_TAGS.map((tag) => (
            <Pressable
              key={tag.label}
              onPress={() => onSelectSuggestion?.(tag.label)}
              unstable_pressDelay={0}
              style={({ pressed }) => [
                styles.discoveryCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`البحث عن ${tag.label}`}
            >
              <Text style={styles.discoveryEmoji}>{tag.emoji}</Text>
              <Text
                style={[
                  styles.discoveryLabel,
                  { color: colors.foreground, fontFamily: theme.typography.bodySmall.fontFamily },
                ]}
              >
                {tag.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  // Loading state with modern skeleton cards
  if (isLoading) {
    return (
      <View style={styles.skeletonContainer}>
        <View style={styles.filterChipsRow}>
          {[0, 1, 2].map((i) => (
            <SkeletonCard
              key={`chip-${i}`}
              style={{ width: 84, height: 36, borderRadius: 18 }}
            />
          ))}
        </View>
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonCard
              key={`row-${i}`}
              style={{ height: 86, borderRadius: 20, marginBottom: 10 }}
            />
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={styles.centered}>
        <View style={[styles.errorIconWrap, { backgroundColor: colors.destructive + '15' }]}>
          <Icon name="AlertCircle" size={36} color={colors.destructive} />
        </View>
        <Text
          style={[
            styles.errorTitle,
            { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
          ]}
        >
          تعذر إتمام البحث
        </Text>
        <Text
          style={[
            styles.errorMessage,
            { color: colors.mutedForeground, fontFamily: theme.typography.bodyMedium.fontFamily },
          ]}
        >
          حدث خطأ أثناء جلب النتائج. يرجى التأكد من اتصالك بالإنترنت.
        </Text>
        <Pressable
          onPress={onRetry}
          unstable_pressDelay={0}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="إعادة المحاولة"
        >
          <Icon name="RotateCcw" size={16} color={colors.primaryForeground} />
          <Text
            style={[
              styles.retryButtonText,
              {
                color: colors.primaryForeground,
                fontFamily: theme.typography.label.fontFamily,
              },
            ]}
          >
            إعادة المحاولة
          </Text>
        </Pressable>
      </View>
    );
  }

  // Empty results state
  if (filteredResults.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {/* Render chips even in empty state so user can toggle between stores/products */}
        {results.length > 0 ? (
          <View style={styles.filterChipsRow}>
            <FilterChip
              label="الكل"
              count={results.length}
              isActive={activeFilter === 'all'}
              onPress={() => setActiveFilter('all')}
            />
            <FilterChip
              label="المتاجر"
              count={storesCount}
              isActive={activeFilter === 'stores'}
              onPress={() => setActiveFilter('stores')}
            />
            <FilterChip
              label="الأصناف"
              count={productsCount}
              isActive={activeFilter === 'products'}
              onPress={() => setActiveFilter('products')}
            />
          </View>
        ) : null}

        <SearchEmptyState
          query={query}
          areaName={areaName}
          onSelectSuggestion={onSelectSuggestion}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Category Filter Chips Bar */}
      <View style={styles.filterChipsRow}>
        <FilterChip
          label="الكل"
          count={results.length}
          isActive={activeFilter === 'all'}
          onPress={() => setActiveFilter('all')}
        />
        <FilterChip
          label="المتاجر"
          count={storesCount}
          isActive={activeFilter === 'stores'}
          onPress={() => setActiveFilter('stores')}
        />
        <FilterChip
          label="الأصناف"
          count={productsCount}
          isActive={activeFilter === 'products'}
          onPress={() => setActiveFilter('products')}
        />
      </View>

      {/* Results List */}
      <FlatList
        style={styles.container}
        data={filteredResults}
        keyExtractor={(item) => `${item.resultType}-${item.id}`}
        renderItem={({ item }) =>
          item.resultType === 'store' ? (
            <StoreResultRow result={item} onPress={() => onSelectStore(item.id)} />
          ) : (
            <ProductResultRow result={item} onPress={() => onSelectProduct(item.id)} />
          )
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ── Filter Chip Component ──────────────────────────────────────────────────

function FilterChip({
  label,
  count,
  isActive,
  onPress,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      unstable_pressDelay={0}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: isActive ? colors.primary : colors.card,
          borderColor: isActive ? colors.primary : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${label}، ${count} نتيجة`}
    >
      <Text
        style={[
          styles.chipLabel,
          {
            color: isActive ? colors.primaryForeground : colors.foreground,
            fontFamily: theme.typography.label.fontFamily,
          },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.chipBadge,
          {
            backgroundColor: isActive
              ? 'rgba(255, 255, 255, 0.25)'
              : colors.muted,
          },
        ]}
      >
        <Text
          style={[
            styles.chipBadgeText,
            {
              color: isActive ? colors.primaryForeground : colors.mutedForeground,
            },
          ]}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterChipsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  skeletonContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  skeletonList: {
    marginTop: 12,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  errorIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
  },
  preSearchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  preSearchHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  preSearchTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  preSearchSubtitle: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  discoveryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  discoveryCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  discoveryEmoji: {
    fontSize: 16,
  },
  discoveryLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});

