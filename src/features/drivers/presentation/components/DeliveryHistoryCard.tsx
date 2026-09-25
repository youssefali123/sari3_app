import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatDateTime } from '@/shared/utils/formatting';
import {
  DeliveryHistoryEntry,
  HistoryStatus,
} from '../../domain/entities/DeliveryHistoryEntry';

const STATUS_LABELS: Record<HistoryStatus, string> = {
  completed: 'Completed',
  declined: 'Declined',
  released: 'Released',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<HistoryStatus, string> = {
  completed: colors.success,
  declined: colors.textSecondary,
  released: colors.warning,
  cancelled: colors.error,
};

interface DeliveryHistoryCardProps {
  entry: DeliveryHistoryEntry;
  onOpen: () => void;
}

/**
 * One delivery-history row: store, date/time, status badge, and the
 * mandatory release reason for 'released' entries.
 */
export function DeliveryHistoryCard({ entry, onOpen }: DeliveryHistoryCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onOpen}
      activeOpacity={0.7}
    >
      <View style={styles.headerRow}>
        <Text style={styles.storeName}>{entry.storeName}</Text>
        <View
          style={[
            styles.badge,
            { backgroundColor: STATUS_COLORS[entry.finalStatus] },
          ]}
        >
          <Text style={styles.badgeText}>
            {STATUS_LABELS[entry.finalStatus]}
          </Text>
        </View>
      </View>
      <Text style={styles.date}>{formatDateTime(entry.orderDate)}</Text>
      {entry.finalStatus === 'released' && entry.releaseReason ? (
        <Text style={styles.releaseReason} numberOfLines={1}>
          Reason: {entry.releaseReason}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  storeName: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
  },
  date: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  releaseReason: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
