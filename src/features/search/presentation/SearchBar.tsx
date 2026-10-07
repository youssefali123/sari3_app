import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useColors } from '@/shared/ui/theme';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  testID?: string;
}

/**
 * SearchBar matching SOURCE design language:
 * 48px height, 15px radius, 1px border, RTL alignment, Lucide Search icon,
 * and circular clear button.
 */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'ابحث عن مطعم أو منتج...',
  testID = 'venue-search',
}: SearchBarProps) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Icon name="Search" size={19} color={colors.mutedForeground} />
      <TextInput
        accessibilityLabel={placeholder}
        style={[
          styles.input,
          {
            color: colors.foreground,
            fontFamily: theme.typography.bodyMedium.fontFamily,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        textAlign="right"
        testID={testID}
      />
      {value.length > 0 ? (
        <Pressable
          style={[styles.clearButton, { backgroundColor: colors.muted }]}
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="مسح البحث"
        >
          <Icon name="X" size={14} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 13,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
