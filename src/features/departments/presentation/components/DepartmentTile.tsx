import React, { useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { Department } from '../../domain/entities/Department';

export interface DepartmentTileProps {
  department: Department;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  width?: number;
}

export const DepartmentTile = React.memo(function DepartmentTile({
  department,
  onPress,
  style,
  width,
}: DepartmentTileProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);

  const showImage = Boolean(department.imageUrl) && !imageError;
  const fallbackIconName = department.iconName || 'Store';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`قسم ${department.name}`}
      onPress={onPress}
      unstable_pressDelay={0}
      style={({ pressed }) => [
        styles.tile,
        width ? { width } : styles.flexTile,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        style,
      ]}
    >
      <View
        style={[
          styles.imageContainer,
          { backgroundColor: colors.muted ?? '#f3f4f6' },
        ]}
      >
        {showImage ? (
          <Image
            source={{ uri: department.imageUrl! }}
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
              { backgroundColor: colors.primarySubtle },
            ]}
          >
            <Icon
              name={fallbackIconName}
              size={30}
              color={colors.primary}
            />
          </View>
        )}
      </View>

      <View style={styles.textContainer}>
        <Text
          numberOfLines={2}
          style={[
            styles.title,
            {
              color: colors.foreground,
              fontFamily: theme.typography.label?.fontFamily || theme.typography.bodySmall?.fontFamily,
            },
          ]}
        >
          {department.name}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  tile: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  flexTile: {
    flex: 1,
    minWidth: 0,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1.18,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
  textContainer: {
    width: '100%',
    paddingTop: 6,
    paddingBottom: 2,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
  },
});
