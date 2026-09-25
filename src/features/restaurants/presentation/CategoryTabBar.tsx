import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StoreCategory } from '../domain/entities/StoreCategory';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface CategoryTabBarProps {
  categories: StoreCategory[];
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

/**
 * Horizontal tab filter for store categories. `null` selection shows all.
 */
export function CategoryTabBar({ categories, selectedId, onSelect }: CategoryTabBarProps) {
  if (categories.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        <TouchableOpacity
          style={[styles.tab, selectedId === null && styles.tabActive]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.tabText, selectedId === null && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.tab, selectedId === category.id && styles.tabActive]}
            onPress={() => onSelect(category.id)}
          >
            <Text
              style={[styles.tabText, selectedId === category.id && styles.tabTextActive]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  tabs: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
});
