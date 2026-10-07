import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/shared/ui/hooks/useColors';
import { Icon } from '@/shared/ui/components/Icon';
import { Surface } from '@/shared/ui/components/AppUI';
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
 * Pre-acceptance projection of an unclaimed order.
 * Upgraded to SOURCE DriverOrderCard design language:
 * 20px radius Surface card, RTL layout, Lucide icons, quick accept & decline actions.
 * Never reveals customer address or phone before claim (FR-004 preserved).
 */
export function AvailableOrderCard({
  order,
  onOpen,
  onClaim,
  isClaiming,
  onDecline,
  isDeclining,
}: AvailableOrderCardProps) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <Surface style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.storeIconBox, { backgroundColor: colors.muted }]}>
            <Icon name="ShoppingBag" size={22} color={colors.foreground} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[styles.storeName, { color: colors.foreground }]}>
              {order.storeName}
            </Text>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {order.itemCount} {order.itemCount === 1 ? 'منتج' : 'منتجات'} · {formatDateTime(order.createdAt)}
            </Text>
          </View>
        </View>

        {order.storeNeighbourhood ? (
          <View style={styles.detailLine}>
            <Icon name="MapPin" size={16} color={colors.secondaryForeground} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>
              منطقة الاستلام: {order.storeNeighbourhood}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionsRow} onStartShouldSetResponder={() => true}>
          {onDecline && (
            <Pressable
              accessibilityRole="button"
              onPress={onDecline}
              disabled={isDeclining}
              style={({ pressed }) => [
                styles.declineButton,
                { borderColor: colors.border, opacity: pressed || isDeclining ? 0.6 : 1 },
              ]}
            >
              {isDeclining ? (
                <ActivityIndicator size="small" color={colors.destructive} />
              ) : (
                <Text style={[styles.declineText, { color: colors.mutedForeground }]}>
                  تجاهل
                </Text>
              )}
            </Pressable>
          )}

          {onClaim && (
            <Pressable
              accessibilityRole="button"
              onPress={onClaim}
              disabled={isClaiming}
              style={({ pressed }) => [
                styles.claimButton,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.border,
                  opacity: pressed || isClaiming ? 0.7 : 1,
                },
              ]}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color={colors.foreground} />
              ) : (
                <View style={styles.claimButtonInner}>
                  <Icon name="CheckCircle2" size={17} color={colors.foreground} />
                  <Text style={[styles.claimText, { color: colors.foreground }]}>
                    قبول الطلب
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 20,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  storeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  metaText: {
    fontSize: 12,
    textAlign: 'right',
  },
  detailLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  claimButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  claimButtonInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 7,
  },
  claimText: {
    fontSize: 14,
    fontWeight: '700',
  },
  declineButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
