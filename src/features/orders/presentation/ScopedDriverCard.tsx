import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { OrderStatus } from '../domain/entities/OrderStatus';
import { OrderDriverInfo } from '../domain/entities/OrderDriverInfo';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface ScopedDriverCardProps {
  status: OrderStatus;
  driverInfo: OrderDriverInfo | null;
}

const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.Accepted,
  OrderStatus.Preparing,
  OrderStatus.OutForDelivery,
];

/**
 * Renders driver name, photo, and phone strictly during active fulfillment
 * (accepted, preparing, out_for_delivery). Collapses to null on terminal
 * states (delivered, cancelled, rejected) or when no driver is assigned
 * (BR-008, FR-021, FR-022).
 */
export function ScopedDriverCard({ status, driverInfo }: ScopedDriverCardProps) {
  if (!ACTIVE_STATUSES.includes(status) || !driverInfo) {
    return null;
  }

  return (
    <View style={styles.card}>
      {driverInfo.driverPhotoUrl ? (
        <Image source={{ uri: driverInfo.driverPhotoUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder]}>
          <Text style={styles.photoPlaceholderText}>
            {driverInfo.driverName.charAt(0)}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.name}>{driverInfo.driverName}</Text>
        <Text style={styles.role}>Your delivery driver</Text>
        {driverInfo.driverPhone ? (
          <Text style={styles.phone}>📞 {driverInfo.driverPhone}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    ...typography.h3,
    color: colors.textMuted,
  },
  info: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  role: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  phone: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
