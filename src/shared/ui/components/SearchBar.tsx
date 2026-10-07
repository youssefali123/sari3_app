import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

/**
 * Shared themed search input (feature 009 US4, contracts §10). Search icon
 * at the start, clear button when non-empty; RTL-aware placement.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Search…' }: SearchBarProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.leadingIcon}>
        <Icon
          name="Search"
          size={18}
          color={theme.colors.textMuted}
          accessibilityHidden
        />
      </View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityRole="search"
      />
      {value.length > 0 ? (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => onChangeText('')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Icon name="X" size={14} color={theme.colors.textSecondary} accessibilityHidden />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.large,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
    },
    leadingIcon: {
      marginRight: theme.spacing.sm,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      ...theme.typography.bodyMedium,
      color: theme.colors.textPrimary,
    },
    clearButton: {
      width: 24,
      height: 24,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.disabled,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
