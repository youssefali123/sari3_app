import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { Surface } from '@/shared/ui/components/AppUI';
import { formatDateTime } from '@/shared/utils/formatting';
import {
  DeliveryHistoryEntry,
  HistoryStatus,
} from '../../domain/entities/DeliveryHistoryEntry';

const STATUS_LABELS: Record<HistoryStatus, string> = {
  completed: 'تم التسليم بنجاح',
  declined: 'تم التجاهل',
  released: 'تم الاعتذار عن الطلب',
  cancelled: 'ملغي من العميل',
};

interface DeliveryHistoryCardProps {
  entry: DeliveryHistoryEntry;
  onOpen: () => void;
}

/**
 * One delivery-history row.
 * Upgraded to Sari3 design language with Surface card, RTL layout, color-coded status badges, and Tajawal typography.
 */
export const DeliveryHistoryCard = React.memo(function DeliveryHistoryCard({
  entry,
  onOpen,
}: DeliveryHistoryCardProps) {
  const colors = useColors();
  const { theme } = useTheme();

  const isCompleted = entry.finalStatus === 'completed';
  const isCancelled = entry.finalStatus === 'cancelled';
  const isReleased = entry.finalStatus === 'released';

  const badgeBg = isCompleted
    ? '#27AE6018'
    : isCancelled
    ? colors.destructive + '15'
    : isReleased
    ? '#F39C1218'
    : colors.muted;

  const badgeColor = isCompleted
    ? '#27AE60'
    : isCancelled
    ? colors.destructive
    : isReleased
    ? '#D68910'
    : colors.mutedForeground;

  return (
    <Pressable
      onPress={onOpen}
      unstable_pressDelay={0}
      style={({ pressed }) => [
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <Surface style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.storeIcon, { backgroundColor: colors.primarySubtle }]}>
            <Icon name="ShoppingBag" size={20} color={colors.primaryPressed} />
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <Text
                style={[
                  styles.storeName,
                  {
                    color: colors.foreground,
                    fontFamily: theme.typography.headingSmall.fontFamily,
                  },
                ]}
                numberOfLines={1}
              >
                {entry.storeName}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: badgeBg,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: badgeColor,
                      fontFamily: theme.typography.caption.fontFamily,
                    },
                  ]}
                >
                  {STATUS_LABELS[entry.finalStatus]}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.dateText,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              {formatDateTime(entry.orderDate)}
            </Text>
          </View>
          <Icon name="ChevronLeft" size={18} color={colors.mutedForeground} />
        </View>

        {entry.finalStatus === 'released' && entry.releaseReason ? (
          <View style={[styles.reasonBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text
              style={[
                styles.releaseReason,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
              numberOfLines={2}
            >
              سبب الاعتذار: {entry.releaseReason}
            </Text>
          </View>
        ) : null}
      </Surface>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 20,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 12,
    textAlign: 'right',
  },
  reasonBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  releaseReason: {
    fontSize: 12,
    textAlign: 'right',
  },
});
