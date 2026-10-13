import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors, useTheme } from '@/shared/ui/theme';
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
 * Upgraded to Sari3 DriverOrderCard design language:
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
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <Surface style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.storeIconBox, { backgroundColor: colors.primarySubtle }]}>
            <Icon name="ShoppingBag" size={22} color={colors.primaryPressed} />
          </View>
          <View style={styles.headerCopy}>
            <Text
              style={[
                styles.storeName,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.headingSmall.fontFamily,
                },
              ]}
            >
              {order.storeName}
            </Text>
            <Text
              style={[
                styles.metaText,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              {order.itemCount} {order.itemCount === 1 ? 'منتج' : 'منتجات'} · {formatDateTime(order.createdAt)}
            </Text>
          </View>
        </View>

        {order.storeNeighbourhood ? (
          <View style={[styles.detailLine, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={[styles.detailPinBadge, { backgroundColor: colors.primarySubtle }]}>
              <Icon name="MapPin" size={14} color={colors.primaryPressed} />
            </View>
            <Text
              style={[
                styles.detailText,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.bodySmall.fontFamily,
                },
              ]}
            >
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
                <Text
                  style={[
                    styles.declineText,
                    {
                      color: colors.mutedForeground,
                      fontFamily: theme.typography.button.fontFamily,
                    },
                  ]}
                >
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
                  opacity: pressed || isClaiming ? 0.75 : 1,
                },
              ]}
            >
              {isClaiming ? (
                <ActivityIndicator size="small" color="#1A1D20" />
              ) : (
                <View style={styles.claimButtonInner}>
                  <Icon name="CheckCircle2" size={17} color="#1A1D20" strokeWidth={2.5} />
                  <Text
                    style={[
                      styles.claimText,
                      {
                        color: '#1A1D20',
                        fontFamily: theme.typography.button.fontFamily,
                      },
                    ]}
                  >
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  detailPinBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: {
    fontSize: 13,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  declineButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontSize: 13,
    fontWeight: '600',
  },
  claimButton: {
    flex: 2,
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  claimText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
