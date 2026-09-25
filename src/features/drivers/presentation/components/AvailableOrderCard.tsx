import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatDateTime } from '@/shared/utils/formatting';
import { AvailableOrderPreview } from '../../domain/entities/AvailableOrderPreview';

interface AvailableOrderCardProps {
  order: AvailableOrderPreview;
  onOpen: () => void;
  /** Accept from the pool (US2); the detail screen has its own Accept. */
  onClaim?: () => void;
  isClaiming?: boolean;
  /** Decline action (US3); hidden until wired by the pool screen. */
  onDecline?: () => void;
  isDeclining?: boolean;
}

/**
 * Pre-acceptance projection of an unclaimed order. Shows store name, store
 * neighbourhood, and item count only — never the customer address or phone
 * (FR-004).
 */
export function AvailableOrderCard({
  order,
  onOpen,
  onClaim,
  isClaiming,
  onDecline,
  isDeclining,
}: AvailableOrderCardProps) {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.body}
        onPress={onOpen}
        activeOpacity={0.7}
      >
        <Text style={styles.storeName}>{order.storeName}</Text>
        <Text style={styles.storeNeighbourhood}>{order.storeNeighbourhood}</Text>
        <Text style={styles.meta}>
          {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} ·{' '}
          {formatDateTime(order.createdAt)}
        </Text>
      </TouchableOpacity>
      <View style={styles.actions}>
        {onClaim ? (
          <TouchableOpacity
            style={styles.claimButton}
            onPress={onClaim}
            disabled={isClaiming}
            activeOpacity={0.7}
          >
            {isClaiming ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.claimText}>Accept</Text>
            )}
          </TouchableOpacity>
        ) : null}
        {onDecline ? (
          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            disabled={isDeclining}
            activeOpacity={0.7}
          >
            {isDeclining ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Text style={styles.declineText}>Decline</Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  storeName: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  storeNeighbourhood: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.xs,
    alignItems: 'stretch',
  },
  claimButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  claimText: {
    ...typography.bodySmall,
    color: colors.white,
    fontWeight: '600',
  },
  declineButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.error,
  },
  declineText: {
    ...typography.bodySmall,
    color: colors.error,
    fontWeight: '600',
  },
});
