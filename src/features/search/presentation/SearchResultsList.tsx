import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SearchResult } from '../domain/entities/SearchResult';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { ProductResultRow } from './ProductResultRow';
import { StoreResultRow } from './StoreResultRow';
import { SearchEmptyState } from './SearchEmptyState';

interface SearchResultsListProps {
  query: string;
  areaName: string | null;
  results: SearchResult[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelectStore: (storeId: string) => void;
  onSelectProduct: (productId: string) => void;
}

/**
 * Unified search results container (feature 008 US1): loading, error, empty,
 * and the ranked mixed list of store and product rows.
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
}: SearchResultsListProps) {
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Search failed. Please try again.</Text>
        <Text style={styles.retryLink} onPress={onRetry}>
          Retry
        </Text>
      </View>
    );
  }

  if (results.length === 0) {
    return <SearchEmptyState query={query} areaName={areaName} />;
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => `${item.resultType}-${item.id}`}
      renderItem={({ item }) =>
        item.resultType === 'store' ? (
          <StoreResultRow result={item} onPress={() => onSelectStore(item.id)} />
        ) : (
          <ProductResultRow result={item} onPress={() => onSelectProduct(item.id)} />
        )
      }
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  retryLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
});
