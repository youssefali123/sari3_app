import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@/shared/ui/components/Icon';
import { useColors, useTheme } from '@/shared/ui/theme';

interface AreaHeaderChipProps {
  selectedAreaName: string | null;
  onPress: () => void;
}

/**
 * Active-area indicator in the customer home header (FR-017). One tap opens
 * the drill-down AreaPickerModal.
 */
export function AreaHeaderChip({ selectedAreaName, onPress }: AreaHeaderChipProps) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.pinBadge,
          { backgroundColor: colors.primarySubtle },
        ]}
      >
        <Icon name="MapPin" size={14} color={colors.primaryPressed} />
      </View>
      <Text
        style={[
          styles.name,
          {
            color: colors.foreground,
            fontFamily: theme.typography.bodySmall.fontFamily,
          },
        ]}
        numberOfLines={1}
      >
        {selectedAreaName ?? 'اختر المنطقة'}
      </Text>
      <Icon name="ChevronDown" size={13} color={colors.mutedForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    maxWidth: '100%',
    gap: 6,
  },
  pinBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
});
