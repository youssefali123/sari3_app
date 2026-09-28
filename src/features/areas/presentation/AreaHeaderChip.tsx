import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface AreaHeaderChipProps {
  selectedAreaName: string | null;
  onPress: () => void;
}

/**
 * Active-area indicator in the customer home header (FR-017). One tap opens
 * the drill-down AreaPickerModal.
 */
export function AreaHeaderChip({ selectedAreaName, onPress }: AreaHeaderChipProps) {
  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.pin}>📍</Text>
      <Text style={styles.name} numberOfLines={1}>
        {selectedAreaName ?? 'Select Area'}
      </Text>
      <Text style={styles.chevron}>▾</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    maxWidth: '100%',
  },
  pin: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  name: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  chevron: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
});
