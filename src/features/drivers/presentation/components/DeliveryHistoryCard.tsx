import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/shared/ui/hooks/useColors';
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
 * Upgraded to SOURCE design language with Surface card, RTL layout, and Arabic statuses.
 */
export function DeliveryHistoryCard({ entry, onOpen }: DeliveryHistoryCardProps) {
  const colors = useColors();

  const isCompleted = entry.finalStatus === 'completed';
  const isCancelled = entry.finalStatus === 'cancelled';

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
      ]}
    >
      <Surface style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.storeIcon, { backgroundColor: colors.muted }]}>
            <Icon name="ShoppingBag" size={20} color={colors.foreground} />
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>
                {entry.storeName}
              </Text>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isCompleted
                      ? colors.secondary
                      : isCancelled
                      ? colors.destructive + '15'
                      : colors.muted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: isCompleted
                        ? colors.secondaryForeground
                        : isCancelled
                        ? colors.destructive
                        : colors.foreground,
                    },
                  ]}
                >
                  {STATUS_LABELS[entry.finalStatus]}
                </Text>
              </View>
            </View>
            <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
              {formatDateTime(entry.orderDate)}
            </Text>
          </View>
          <Icon name="ChevronLeft" size={18} color={colors.mutedForeground} />
        </View>

        {entry.finalStatus === 'released' && entry.releaseReason ? (
          <View style={[styles.reasonBox, { backgroundColor: colors.muted }]}>
            <Text style={[styles.releaseReason, { color: colors.mutedForeground }]} numberOfLines={2}>
              سبب الاعتذار: {entry.releaseReason}
            </Text>
          </View>
        ) : null}
      </Surface>
    </Pressable>
  );
}

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
  },
  releaseReason: {
    fontSize: 12,
    textAlign: 'right',
  },
});
