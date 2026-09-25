import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SavedDeliveryAddress } from '../domain/entities/SavedDeliveryAddress';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface AddressCardProps {
  address: SavedDeliveryAddress;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  selected?: boolean;
}

/**
 * Saved delivery address card with default badge and edit/delete actions.
 */
export function AddressCard({ address, onEdit, onDelete, onPress, selected }: AddressCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={styles.info}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{address.label}</Text>
          {address.isDefault ? (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          ) : null}
          {selected ? (
            <View style={[styles.defaultBadge, styles.selectedBadge]}>
              <Text style={[styles.defaultBadgeText, styles.selectedBadgeText]}>Selected</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.addressText}>{address.addressText}</Text>
      </View>
      {onEdit || onDelete ? (
        <View style={styles.actions}>
          {onEdit ? (
            <TouchableOpacity onPress={onEdit} hitSlop={8}>
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity onPress={onDelete} hitSlop={8}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: colors.primary,
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  defaultBadge: {
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  selectedBadge: {
    backgroundColor: colors.primaryLight,
  },
  selectedBadgeText: {
    color: colors.white,
  },
  addressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  editText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
});
