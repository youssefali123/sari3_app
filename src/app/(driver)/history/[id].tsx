import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/shared/ui/hooks/useColors';
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  LoadingState,
  PageScroll,
  Surface,
} from '@/shared/ui/components';
import { Icon } from '@/shared/ui/components/Icon';
import { formatDateTime } from '@/shared/utils/formatting';
import { useDriverHistory } from '@/features/drivers/application/hooks/useDriverHistory';
import { HistoryStatus } from '@/features/drivers/domain/entities/DeliveryHistoryEntry';

const STATUS_LABELS: Record<HistoryStatus, string> = {
  completed: 'تم التسليم بنجاح',
  declined: 'تم التجاهل',
  released: 'تم الاعتذار عن الطلب',
  cancelled: 'ملغي من قبل العميل',
};

/**
 * Full detail of one delivery-history entry.
 * Upgraded to SOURCE design language with AppScreen, BrandHeader, and Surface.
 */
export default function DriverDeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { data, isLoading, error } = useDriverHistory();

  if (isLoading) {
    return (
      <AppScreen>
        <BrandHeader title="تفاصيل الرحلة" onBack={() => router.back()} />
        <LoadingState />
      </AppScreen>
    );
  }

  if (error) {
    return (
      <AppScreen>
        <BrandHeader title="تفاصيل الرحلة" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error.message}
          </Text>
        </View>
      </AppScreen>
    );
  }

  const entry = (data ?? []).find((e) => e.id === id);

  if (!entry) {
    return (
      <AppScreen>
        <BrandHeader title="تفاصيل الرحلة" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="⚠️"
            title="الطلب غير موجود"
            message="لم يتم العثور على بيانات هذه الرحلة في السجل."
          />
        </View>
      </AppScreen>
    );
  }

  const isCompleted = entry.finalStatus === 'completed';

  return (
    <AppScreen>
      <BrandHeader
        title="تفاصيل الرحلة"
        subtitle={`طلب ${entry.storeName}`}
        onBack={() => router.back()}
      />
      <PageScroll>
        <Surface style={styles.card}>
          <View style={styles.headerRow}>
            <View style={[styles.storeIcon, { backgroundColor: colors.muted }]}>
              <Icon name="ShoppingBag" size={24} color={colors.foreground} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.storeName, { color: colors.foreground }]}>
                {entry.storeName}
              </Text>
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                رقم الطلب: #{entry.orderId.slice(0, 8)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>حالة التوصيل</Text>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isCompleted ? colors.secondary : colors.muted,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: isCompleted ? colors.secondaryForeground : colors.foreground,
                  },
                ]}
              >
                {STATUS_LABELS[entry.finalStatus]}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>تاريخ ووقت الطلب</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>
              {formatDateTime(entry.orderDate)}
            </Text>
          </View>

          {entry.finalStatus === 'released' && entry.releaseReason ? (
            <Surface style={[styles.reasonCard, { backgroundColor: colors.muted }]}>
              <Text style={[styles.reasonTitle, { color: colors.foreground }]}>
                سبب الاعتذار المسجل:
              </Text>
              <Text style={[styles.reasonText, { color: colors.mutedForeground }]}>
                {entry.releaseReason}
              </Text>
            </Surface>
          ) : null}
        </Surface>
      </PageScroll>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 22,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  storeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  metaText: {
    fontSize: 12,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reasonCard: {
    padding: 14,
    borderRadius: 14,
    gap: 6,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  reasonText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
