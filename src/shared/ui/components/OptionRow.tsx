import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface OptionRowProps {
  label: string;
  /** Optional price rendered in the gold "+ price" trailing pattern. */
  priceText?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Selectable option row (feature 011 design identity): rounded checkbox
 * (brand-gold when checked), label, and the optional gold "+ price" trailing
 * pattern. Used for product add-ons; reusable for any check-style option.
 * The whole row is pressable with a 44pt minimum touch target.
 */
export function OptionRow({
  label,
  priceText,
  checked,
  onToggle,
  disabled = false,
}: OptionRowProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      <View style={styles.end}>
        {priceText ? (
          <View style={styles.priceWrap}>
            <Text style={styles.priceText}>{priceText}</Text>
            <View style={styles.plusBadge}>
              <Text style={styles.plusGlyph} accessible={false}>
                +
              </Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? (
            <Text style={styles.checkGlyph} accessible={false}>
              ✓
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 44,
      paddingVertical: theme.spacing.xs,
    },
    label: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textPrimary,
      flexShrink: 1,
      textAlign: 'right',
    },
    labelDisabled: {
      color: theme.colors.textMuted,
    },
    end: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    priceWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    priceText: {
      ...theme.typography.numeric,
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    plusBadge: {
      width: 22,
      height: 22,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.primarySubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusGlyph: {
      fontSize: 14,
      lineHeight: 16,
      color: theme.colors.primary,
      fontWeight: '700',
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: theme.radii.small + 2,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkGlyph: {
      fontSize: 13,
      lineHeight: 15,
      color: theme.colors.secondary,
      fontWeight: '700',
    },
  });
