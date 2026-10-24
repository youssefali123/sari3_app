import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColors } from '@/shared/ui/hooks/useColors';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';
import { CuisineCategory } from '../../domain/entities/CuisineCategory';

export interface CuisineTileProps {
  category: CuisineCategory;
  isSelected: boolean;
  onPress: () => void;
}

export const CuisineTile = React.memo(function CuisineTile({
  category,
  isSelected,
  onPress,
}: CuisineTileProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);

  const showImage = Boolean(category.imageUrl) && !imageError;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`تصنيف ${category.name}${isSelected ? '، محدد حالياً' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        pressed && styles.tilePressed,
      ]}
    >
      <View
        style={[
          styles.imageContainer,
          {
            backgroundColor: isSelected ? colors.primarySubtle : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
          isSelected && styles.imageContainerActive,
        ]}
      >
        {showImage ? (
          <Image
            source={{ uri: category.imageUrl! }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={[
              styles.fallbackIconWrapper,
              { backgroundColor: isSelected ? colors.primary : colors.primarySubtle },
            ]}
          >
            <Icon
              name={category.iconName || 'Utensils'}
              size={24}
              color={isSelected ? colors.primaryForeground : colors.primary}
            />
          </View>
        )}

        {isSelected ? (
          <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
            <Icon name="Check" size={10} color={colors.primaryForeground} strokeWidth={3} />
          </View>
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.title,
          {
            color: isSelected ? colors.foreground : colors.mutedForeground,
            fontFamily: isSelected
              ? theme.typography.label.fontFamily
              : theme.typography.bodySmall.fontFamily,
            fontWeight: isSelected ? '700' : '500',
          },
        ]}
      >
        {category.name}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    width: 74,
    marginHorizontal: 5,
  },
  tilePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  imageContainer: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
  },
  imageContainerActive: {
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackIconWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  title: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
    textAlign: 'center',
  },
});
