import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  CANCELLED_NOTICE_QUERY_KEY,
  CancelledOrderNotice,
  useActiveOrder,
} from '@/features/drivers/application/hooks/useActiveOrder';
import { ActiveOrderCard } from '@/features/drivers/presentation/components/ActiveOrderCard';
import { OrderReleaseModal } from '@/features/drivers/presentation/components/OrderReleaseModal';
import { Order } from '@/features/orders/domain/entities/Order';
import { OrderRepository } from '@/features/orders/domain/repositories/OrderRepository';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';

const orderRepository: OrderRepository = new SupabaseOrderRepository();

/** Strictly sequential stepper with Arabic labels matching SOURCE */
const NEXT_STEP_LABELS: Record<string, string> = {
  accepted: 'بدء تجهيز الطلب بالمحل',
  preparing: 'استلمت الطلب، ابدأ التوصيل',
  out_for_delivery: 'تأكيد تسليم الطلب للعميل',
};

/**
 * Active delivery screen.
 * Upgraded to SOURCE DriverScreens design language with AppScreen, BrandHeader,
 * Surface cards, and Arabic statuses.
 */
export default function ActiveOrderScreen() {
  const {
    activeOrder,
    isLoading,
    error,
    advanceStatus,
    isAdvancing,
    advanceFailedWith,
    releaseOrder,
    isReleasing,
  } = useActiveOrder();
  const [releaseModalVisible, setReleaseModalVisible] = useState(false);
  const router = useRouter();
  const colors = useColors();
  const queryClient = useQueryClient();
  const lastActiveRef = useRef<Order | null>(null);
  const notifiedOrderIds = useRef(new Set<string>());
  const { data: cancelledNoticeFor } = useQuery<CancelledOrderNotice | null>({
    queryKey: CANCELLED_NOTICE_QUERY_KEY,
    queryFn: () => null,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // US3: when the active order disappears, tell the driver WHY if the customer cancelled it
  useEffect(() => {
    if (activeOrder) {
      lastActiveRef.current = activeOrder;
      return;
    }
    const last = lastActiveRef.current;
    if (!last || notifiedOrderIds.current.has(last.id)) return;
    notifiedOrderIds.current.add(last.id);
    orderRepository
      .getOrderById(last.id)
      .then((o) => {
        if (o.status === 'cancelled') {
          queryClient.setQueryData(CANCELLED_NOTICE_QUERY_KEY, {
            orderId: o.id,
            storeName: o.storeName,
          });
        }
      })
      .catch(() => undefined);
  }, [activeOrder, queryClient]);

  const handleAdvance = async () => {
    if (!activeOrder) return;
    try {
      const result = await advanceStatus(activeOrder.id);
      if (advanceFailedWith(result, 'ORDER_STATUS_CHANGED')) {
        Alert.alert('تم إلغاء الطلب', 'قام العميل بإلغاء هذا الطلب.');
      }
    } catch {
      // Other errors surface through the hook's error state.
    }
  };

  if (isLoading) {
    return (
      <AppScreen>
        <BrandHeader title="طلباتي النشطة" subtitle="توصيلاتك الحالية" />
        <LoadingState />
      </AppScreen>
    );
  }

  if (error && !activeOrder) {
    return (
      <AppScreen>
        <BrandHeader title="طلباتي النشطة" subtitle="توصيلاتك الحالية" />
        <View style={styles.centerContainer}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>
            {error.message}
          </Text>
        </View>
      </AppScreen>
    );
  }

  if (!activeOrder) {
    if (cancelledNoticeFor) {
      return (
        <AppScreen>
          <BrandHeader title="طلباتي النشطة" subtitle="توصيلاتك الحالية" />
          <View style={styles.centerContainer}>
            <Surface style={[styles.cancelledCard, { borderColor: colors.destructive + '40' }]}>
              <Text style={[styles.cancelledTitle, { color: colors.destructive }]}>
                قام العميل بإلغاء الطلب
              </Text>
              <Text style={[styles.cancelledBody, { color: colors.foreground }]}>
                تم إلغاء الطلب التابع لـ {cancelledNoticeFor?.storeName}. أصبح جدول توصيلك متاحاً الآن لاستقبال طلبات جديدة.
              </Text>
              <PrimaryButton
                title="تصفح الطلبات المتاحة"
                icon="basket"
                onPress={() => router.replace('/(driver)/available-orders')}
              />
            </Surface>
          </View>
        </AppScreen>
      );
    }
    return (
      <AppScreen>
        <BrandHeader title="طلباتي النشطة" subtitle="توصيلاتك الحالية" />
        <View style={styles.centerContainer}>
          <EmptyState
            emoji="🛵"
            title="لا توجد توصيلات نشطة"
            message="اقبل طلباً من قائمة الطلبات المتاحة ليظهر هنا وتتابع مراحل توصيله."
            action={
              <PrimaryButton
                title="تصفح الطلبات المتاحة"
                icon="basket"
                onPress={() => router.replace('/(driver)/available-orders')}
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
        title="طلباتي النشطة"
        subtitle={`طلب ${activeOrder.storeName}`}
      />
      <PageScroll>
        <ActiveOrderCard
          order={activeOrder}
          nextStepLabel={NEXT_STEP_LABELS[activeOrder.status] ?? null}
          onAdvance={() => void handleAdvance()}
          isAdvancing={isAdvancing}
          error={error}
          customerCancelled={activeOrder.status === 'cancelled'}
          onReturnToPool={() => router.replace('/(driver)/available-orders')}
          onRelease={
            activeOrder.status !== 'delivered' && activeOrder.status !== 'cancelled'
              ? () => setReleaseModalVisible(true)
              : undefined
          }
        />
      </PageScroll>

      <OrderReleaseModal
        visible={releaseModalVisible}
        isSubmitting={isReleasing}
        error={error}
        onSubmit={(reason) => {
          releaseOrder(activeOrder.id, reason)
            .then(() => {
              setReleaseModalVisible(false);
            })
            .catch(() => {
              // Error surfaces through the hook into the modal.
            });
        }}
        onClose={() => setReleaseModalVisible(false)}
      />
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
  cancelledCard: {
    padding: 20,
    borderRadius: 22,
    gap: 12,
  },
  cancelledTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
  },
  cancelledBody: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
