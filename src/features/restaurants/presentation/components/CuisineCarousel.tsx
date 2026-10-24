import React from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/shared/ui/hooks/useColors';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';
import { CuisineCategory } from '../../domain/entities/CuisineCategory';
import { CuisineTile } from './CuisineTile';

export interface CuisineCarouselProps {
  categories: CuisineCategory[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  isLoading?: boolean;
  title?: string;
  showHeader?: boolean;
}

export function CuisineCarousel({
  categories,
  selectedCategoryId,
  onSelectCategory,
  isLoading = false,
  title = 'استكشف بالتصنيف',
  showHeader = true,
}: CuisineCarouselProps) {
  const colors = useColors();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.container}>
        {showHeader && (
          <View style={styles.header}>
            <Text
              style={[
                styles.headerTitle,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.headingSmall.fontFamily,
                },
              ]}
            >
              {title}
            </Text>
          </View>
        )}
        <FlatList
          horizontal
          inverted
          data={[0, 1, 2, 3, 4]}
          keyExtractor={(i) => String(i)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          renderItem={() => (
            <View style={styles.skeletonTile}>
              <View
                style={[
                  styles.skeletonCircle,
                  { backgroundColor: colors.muted },
                ]}
              />
              <View
                style={[
                  styles.skeletonText,
                  { backgroundColor: colors.muted },
                ]}
              />
            </View>
          )}
        />
      </View>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  const isAllSelected = selectedCategoryId === null;

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingSmall.fontFamily,
              },
            ]}
          >
            {title}
          </Text>
          {selectedCategoryId ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelectCategory(null)}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.resetLink,
                  {
                    color: colors.primary,
                    fontFamily: theme.typography.caption.fontFamily,
                  },
                ]}
              >
                عرض الكل
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <FlatList
        horizontal
        inverted
        data={categories}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isAllSelected }}
            accessibilityLabel="عرض كل المطاعم"
            onPress={() => onSelectCategory(null)}
            style={({ pressed }) => [
              styles.allTile,
              pressed && styles.tilePressed,
            ]}
          >
            <View
              style={[
                styles.allIconContainer,
                {
                  backgroundColor: isAllSelected
                    ? colors.primary
                    : colors.card,
                  borderColor: isAllSelected
                    ? colors.primary
                    : colors.border,
                },
                isAllSelected && styles.allIconContainerActive,
              ]}
            >
              <Icon
                name="Sparkles"
                size={24}
                color={
                  isAllSelected
                    ? colors.primaryForeground
                    : colors.mutedForeground
                }
              />
            </View>
            <Text
              style={[
                styles.allTitle,
                {
                  color: isAllSelected
                    ? colors.foreground
                    : colors.mutedForeground,
                  fontFamily: isAllSelected
                    ? theme.typography.label.fontFamily
                    : theme.typography.bodySmall.fontFamily,
                  fontWeight: isAllSelected ? '700' : '500',
                },
              ]}
            >
              الكل
            </Text>
          </Pressable>
        }
        renderItem={({ item }) => (
          <CuisineTile
            category={item}
            isSelected={selectedCategoryId === item.id}
            onPress={() => onSelectCategory(item.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  resetLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  allTile: {
    alignItems: 'center',
    width: 68,
    marginHorizontal: 4,
  },
  tilePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  allIconContainer: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  allIconContainerActive: {
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  allTitle: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    textAlign: 'center',
  },
  skeletonTile: {
    alignItems: 'center',
    width: 74,
    marginHorizontal: 5,
  },
  skeletonCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  skeletonText: {
    width: 44,
    height: 10,
    borderRadius: 5,
    marginTop: 8,
  },
});
