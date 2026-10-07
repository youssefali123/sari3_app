import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/shared/ui/hooks/useColors';
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  LoadingState,
  PageScroll,
  PrimaryButton,
  Surface,
} from '@/shared/ui/components';
import { Icon } from '@/shared/ui/components/Icon';
import { formatDateTime } from '@/shared/utils/formatting';
import { useAvailableOrders } from '@/features/drivers/application/hooks/useAvailableOrders';

const NOT_AVAILABLE_MESSAGE = 'هذا الطلب لم يعد متاحاً (تم قبوله من سائق آخر أو تم إلغاؤه).';

/**
 * Privacy-safe preview of a single unclaimed order.
 * Upgraded to SOURCE design language with BrandHeader, Surface, and PrimaryButton.
 */
export default function AvailableOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { orders, isLoading, claim, isClaiming, error } = useAvailableOrders();
  const [notAvailable, setNotAvailable] = useState(false);

  const preview = orders.find((o) => o.id === id) ?? null;

  const handleAccept = async () => {
    if (!id) return;
    try {
      const result = await claim(id);
      if (result.claimed) {
        router.replace('/(driver)/active-order');
      } else {
        setNotAvailable(true);
      }
    } catch {
      // Mutation error surfaces through `error` below.
    }
  };

  if (isLoading) {
    return (
      <AppScreen>
        <BrandHeader title="تفاصيل الطلب" onBack={() => router.back()} />
        <LoadingState />
      </AppScreen>
    );
  }

  if (notAvailable || !preview) {
    return (
      <AppScreen>
        <BrandHeader title="تفاصيل الطلب" onBack={() => router.back()} />
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="⚠️"
            title="الطلب غير متاح"
            message={NOT_AVAILABLE_MESSAGE}
            action={
              <PrimaryButton
                title="العودة للطلبات المتاحة"
                icon="arrow-back"
                onPress={() => router.back()}
              />
            }
          />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BrandHeader
        title="تفاصيل الطلب"
        subtitle={`طلب من ${preview.storeName}`}
        onBack={() => router.back()}
      />
      <PageScroll>
        <Surface style={styles.orderCard}>
          <View style={styles.storeHeader}>
            <View style={[styles.storeIcon, { backgroundColor: colors.muted }]}>
              <Icon name="ShoppingBag" size={26} color={colors.foreground} />
            </View>
            <View style={styles.storeCopy}>
              <Text style={[styles.storeName, { color: colors.foreground }]}>
                {preview.storeName}
              </Text>
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {preview.itemCount} {preview.itemCount === 1 ? 'منتج' : 'منتجات'} · {formatDateTime(preview.createdAt)}
              </Text>
            </View>
          </View>

          {preview.storeNeighbourhood ? (
            <View style={styles.detailLine}>
              <Icon name="MapPin" size={17} color={colors.secondaryForeground} />
              <Text style={[styles.detailText, { color: colors.foreground }]}>
                منطقة الاستلام: {preview.storeNeighbourhood}
              </Text>
            </View>
          ) : null}

          <Surface style={[styles.privacyNotice, { backgroundColor: colors.muted }]}>
            <Icon name="HelpCircle" size={18} color={colors.mutedForeground} />
            <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>
              عنوان التوصيل الدقيق وبيانات الاتصال بالعميل ستظهر فور تأكيد قبولك للطلب.
            </Text>
          </Surface>

          {error ? (
            <Text style={[styles.errorText, { color: colors.destructive }]}>
              {error.message}
            </Text>
          ) : null}

          <PrimaryButton
            title="قبول وبدء التوصيل"
            icon="checkmark"
            loading={isClaiming}
            onPress={() => void handleAccept()}
          />
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
    paddingBottom: 60,
  },
  orderCard: {
    gap: 16,
    padding: 18,
    borderRadius: 22,
  },
  storeHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
  },
  storeIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  metaText: {
    fontSize: 13,
    textAlign: 'right',
  },
  detailLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  privacyNotice: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
  },
  privacyNote: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
