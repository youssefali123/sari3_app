import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SavedDeliveryAddress } from '../domain/entities/SavedDeliveryAddress';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { IconButton } from '@/shared/ui/components/IconButton';

interface AddressCardProps {
  address: SavedDeliveryAddress;
  onEdit?: () => void;
  onDelete?: () => void;
  onPress?: () => void;
  selected?: boolean;
}

function resolveAddressIcon(label: string): string {
  const normalized = label.trim().toLowerCase();
  if (normalized.includes('منزل') || normalized.includes('بيت') || normalized.includes('home')) {
    return 'Home';
  }
  if (
    normalized.includes('عمل') ||
    normalized.includes('شغل') ||
    normalized.includes('مكتب') ||
    normalized.includes('work') ||
    normalized.includes('office')
  ) {
    return 'Building2';
  }
  return 'MapPin';
}

/**
 * Saved delivery address card styled per the app's brand identity:
 * RTL Surface card with 20px radius, semantic icon container, status badges,
 * and quick edit/delete actions.
 */
export function AddressCard({
  address,
  onEdit,
  onDelete,
  onPress,
  selected,
}: AddressCardProps) {
  const colors = useColors();
  const { theme } = useTheme();

  const iconName = resolveAddressIcon(address.label);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 2 : 1,
        },
        pressed && Boolean(onPress) && { opacity: 0.85, transform: [{ scale: 0.99 }] },
      ]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`عنوان ${address.label}: ${address.addressText}`}
    >
      {/* Icon Pill Container */}
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: address.isDefault ? colors.primarySubtle : colors.secondary,
          },
        ]}
      >
        <Icon
          name={iconName}
          size={20}
          color={address.isDefault ? colors.primary : colors.secondaryForeground}
        />
      </View>

      {/* Main Info */}
      <View style={styles.info}>
        <View style={styles.labelRow}>
          <Text
            style={[
              styles.label,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingSmall.fontFamily,
              },
            ]}
            numberOfLines={1}
          >
            {address.label}
          </Text>

          {address.isDefault ? (
            <View style={[styles.badge, { backgroundColor: colors.primarySubtle }]}>
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: colors.primaryPressed,
                    fontFamily: theme.typography.caption.fontFamily,
                  },
                ]}
              >
                افتراضي
              </Text>
            </View>
          ) : null}

          {selected ? (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: colors.primaryForeground,
                    fontFamily: theme.typography.caption.fontFamily,
                  },
                ]}
              >
                محدد
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[
            styles.addressText,
            {
              color: colors.mutedForeground,
              fontFamily: theme.typography.caption.fontFamily,
            },
          ]}
          numberOfLines={2}
        >
          {address.addressText}
        </Text>
      </View>

      {/* Actions */}
      {onEdit || onDelete ? (
        <View style={styles.actions}>
          {onEdit ? (
            <IconButton
              name="Pencil"
              size="small"
              variant="ghost"
              color={colors.mutedForeground}
              accessibilityLabel={`تعديل عنوان ${address.label}`}
              onPress={onEdit}
            />
          ) : null}
          {onDelete ? (
            <IconButton
              name="Trash2"
              size="small"
              variant="ghost"
              color={colors.destructive}
              accessibilityLabel={`حذف عنوان ${address.label}`}
              onPress={onDelete}
            />
          ) : null}
        </View>
      ) : selected !== undefined ? (
        <View
          style={[
            styles.radioCircle,
            {
              borderColor: selected ? colors.primary : colors.border,
              backgroundColor: selected ? colors.primary : 'transparent',
            },
          ]}
        >
          {selected ? <Icon name="Check" size={14} color={colors.primaryForeground} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    alignItems: 'flex-end',
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  addressText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
