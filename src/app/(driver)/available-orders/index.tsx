import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/shared/ui/hooks/useColors';
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  LoadingState,
  PrimaryButton,
  Surface,
} from '@/shared/ui/components';
import { Icon } from '@/shared/ui/components/Icon';
import { useDriverAvailability } from '@/features/drivers/application/hooks/useDriverAvailability';
import { useDriverAreas } from '@/features/drivers/application/hooks/useDriverAreas';
import { useActiveOrder } from '@/features/drivers/application/hooks/useActiveOrder';
import { useAvailableOrders } from '@/features/drivers/application/hooks/useAvailableOrders';
import { AvailabilityToggle } from '@/features/drivers/presentation/components/AvailabilityToggle';
import { AvailableOrderCard } from '@/features/drivers/presentation/components/AvailableOrderCard';
import { AvailableOrderPreview } from '@/features/drivers/domain/entities/AvailableOrderPreview';

const NOT_AVAILABLE_MESSAGE = 'تم قبول هذا الطلب من قبل سائق آخر أو تم إلغاؤه.';

/**
 * Order pool for Available drivers.
 * Upgraded to SOURCE DriverScreens design language while keeping all business logic.
 */
export default function AvailableOrdersScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAvailable, isLoading: availabilityLoading } =
    useDriverAvailability();
  const { hasAssignedAreas } = useDriverAreas();
  const { activeOrder, isLoading: activeOrderLoading } = useActiveOrder();
  const {
    orders,
    isLoading: poolLoading,
    error,
    claim,
    isClaiming,
    decline,
    decliningOrderId,
  } = useAvailableOrders();
  const [lostRaceOrderId, setLostRaceOrderId] = useState<string | null>(null);

  const handleOpen = (orderId: string) => {
    router.push(`/(driver)/available-orders/${orderId}`);
  };

  const handleQuickClaim = async (orderId: string) => {
    try {
      const result = await claim(orderId);
      if (result.claimed) {
        router.replace('/(driver)/active-order');
      } else {
        setLostRaceOrderId(orderId);
      }
    } catch {
      // Errors surface through the hook's `error`.
    }
  };

  const renderOrder = ({ item }: { item: AvailableOrderPreview }) => (
    <View style={styles.orderWrapper}>
      {lostRaceOrderId === item.id ? (
        <Text style={[styles.lostRaceText, { color: colors.destructive }]}>
          {NOT_AVAILABLE_MESSAGE}
        </Text>
      ) : null}
      <AvailableOrderCard
        order={item}
        onOpen={() => handleOpen(item.id)}
        onClaim={() => handleQuickClaim(item.id)}
        isClaiming={isClaiming}
        onDecline={() => {
          decline(item.id).catch(() => {});
        }}
        isDeclining={decliningOrderId === item.id}
      />
    </View>
  );

  return (
    <AppScreen>
      <BrandHeader title="الطلبات المتاحة" subtitle="جاهزة للتوصيل حولك" />
      <AvailabilityToggle />

      {availabilityLoading || activeOrderLoading ? (
        <LoadingState />
      ) : !hasAssignedAreas ? (
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="📍"
            title="لم يتم تعيين مناطق توصيل"
            message="يرجى التواصل مع الإدارة أو الدعم الفني لتفعيل نطاقات التوصيل الخاصة بك."
          />
        </View>
      ) : !isAvailable ? (
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="🛵"
            title="أنت غير متصل حالياً"
            message="قم بتفعيل وضع الاتصال في الأعلى لاستقبال وتصفح طلبات التوصيل المتاحة."
          />
        </View>
      ) : activeOrder ? (
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="📦"
            title="لديك توصيلة نشطة حالياً"
            message="أكمل الطلب النشط في تبويب 'طلباتي النشطة' لتتمكن من استقبال طلبات جديدة."
            action={
              <PrimaryButton
                title="الانتقال إلى التوصيلة النشطة"
                icon="bicycle"
                onPress={() => router.replace('/(driver)/active-order' as never)}
              />
            }
          />
        </View>
      ) : poolLoading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="🛵"
            title="لا توجد طلبات متاحة الآن"
            message="ستظهر الطلبات الجديدة هنا فور قيام العملاء بالطلب في منطقتك."
          />
        </View>
      ) : (
        <FlatList
          style={styles.pool}
          contentContainerStyle={styles.poolContent}
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          ListHeaderComponent={
            <Surface style={[styles.driverIntro, { backgroundColor: colors.secondary }]}>
              <View style={[styles.driverIcon, { backgroundColor: colors.card }]}>
                <Icon name="Bike" size={23} color={colors.secondaryForeground} />
              </View>
              <View style={styles.introCopy}>
                <Text style={[styles.introTitle, { color: colors.secondaryForeground }]}>
                  متاح لاستلام الطلبات
                </Text>
                <Text style={[styles.introSubtitle, { color: colors.secondaryForeground + 'B3' }]}>
                  اختر طلباً لعرض تفاصيله وقبوله للتوصيل.
                </Text>
              </View>
            </Surface>
          }
          ListFooterComponent={
            error ? (
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error.message}
              </Text>
            ) : null
          }
        />
      )}

      {isClaiming ? (
        <View style={styles.claimingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  pool: {
    flex: 1,
  },
  poolContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 12,
    paddingBottom: 120,
  },
  orderWrapper: {
    gap: 6,
  },
  centerContainer: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: 'center',
    paddingBottom: 60,
  },
  driverIntro: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 20,
    marginBottom: 4,
  },
  driverIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  introSubtitle: {
    fontSize: 12,
    textAlign: 'right',
  },
  lostRaceText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
    padding: 12,
  },
  claimingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
