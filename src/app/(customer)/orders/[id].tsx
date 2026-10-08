import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OrderRepository } from '@/features/orders/domain/repositories/OrderRepository';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';
import { DriverInfoService } from '@/features/orders/domain/services/DriverInfoService';
import { SupabaseDriverInfoService } from '@/features/orders/infrastructure/SupabaseDriverInfoService';
import { OrderRealtimeService } from '@/features/orders/domain/services/OrderRealtimeService';
import { SupabaseOrderRealtimeService } from '@/features/orders/infrastructure/SupabaseOrderRealtimeService';
import { OrderStatus } from '@/features/orders/domain/entities/OrderStatus';
import { useReorder } from '@/features/orders/application/hooks/useReorder';
import { ScopedDriverCard } from '@/features/orders/presentation/ScopedDriverCard';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { SkeletonOrderDetail } from '@/shared/ui/motion';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { ConfirmDialog } from '@/shared/ui/components/ConfirmDialog';
import { showAlert } from '@/shared/utils/alert';
import { useColors, useTheme } from '@/shared/ui/theme';
import { AppScreen, BrandHeader, EmptyState, PrimaryButton, Surface } from '@/shared/ui/components/AppUI';
import { Icon } from '@/shared/ui/components/Icon';
import { formatCurrency, formatDateTime } from '@/shared/utils/formatting';

const orderRepository: OrderRepository = new SupabaseOrderRepository();
const driverInfoService: DriverInfoService = new SupabaseDriverInfoService();
const orderRealtimeService: OrderRealtimeService = new SupabaseOrderRealtimeService();

const CANCELLABLE_STATUSES: OrderStatus[] = [
  OrderStatus.Pending,
  OrderStatus.Accepted,
  OrderStatus.Preparing,
];

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
  OrderStatus.Expired,
];

const ARABIC_STATUS_LABELS: Record<string, string> = {
  pending: 'تم استلام الطلب',
  accepted: 'تم قبول الطلب',
  preparing: 'جاري التجهيز',
  out_for_delivery: 'الطلب في الطريق إليك',
  delivered: 'تم تسليم الطلب بنجاح',
  cancelled: 'تم إلغاء الطلب',
  expired: 'انتهت صلاحية الطلب',
  rejected: 'تم رفض الطلب',
};

const TRACKING_STEPS = [
  { status: 'pending', label: 'تم الطلب' },
  { status: 'accepted', label: 'تم التأكيد' },
  { status: 'out_for_delivery', label: 'جاري التوصيل' },
  { status: 'delivered', label: 'تم التسليم' },
];

const STATUS_PROGRESSION = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];

export default function OrderDetailScreen() {
  useRequireAuth('/(customer)/orders');
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const reorder = useReorder();
  const { theme } = useTheme();
  const colors = useColors();
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [hideConfirmVisible, setHideConfirmVisible] = useState(false);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderRepository.getOrderById(orderId),
    enabled: Boolean(orderId),
  });

  const isActive = order ? !TERMINAL_STATUSES.includes(order.status) : false;
  const isCancellable = order ? CANCELLABLE_STATUSES.includes(order.status) : false;
  const isTerminal = order ? TERMINAL_STATUSES.includes(order.status) : false;

  const { data: driverInfo } = useQuery({
    queryKey: ['orderDriverInfo', orderId],
    queryFn: () => driverInfoService.getOrderDriverInfo(orderId),
    enabled: Boolean(orderId) && isActive,
  });

  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = orderRealtimeService.subscribeToOrderStatus(orderId, () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });
    return unsubscribe;
  }, [orderId, queryClient]);

  const cancelMutation = useMutation({
    mutationFn: () => orderRepository.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: Error) => {
      showAlert('تعذر إلغاء الطلب', error.message);
    },
  });

  const hideOrder = async () => {
    try {
      await orderRepository.hideOrder(orderId);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      router.replace('/(customer)/orders');
    } catch (error) {
      showAlert('تعذر إخفاء الطلب', error instanceof Error ? error.message : 'حاول مرة أخرى.');
    }
  };

  if (isLoading) {
    return (
      <AppScreen>
        <BrandHeader title="تفاصيل الطلب" onBack={() => router.back()} />
        <SkeletonOrderDetail />
      </AppScreen>
    );
  }

  if (isError || !order) {
    return (
      <AppScreen>
        <BrandHeader title="تفاصيل الطلب" onBack={() => router.back()} />
        <View style={styles.errorContent}>
          <EmptyState
            title="تعذر العثور على الطلب"
            message="الطلب غير موجود أو حدث خطأ أثناء جلبه."
            icon="receipt-outline"
          />
          <PrimaryButton title="حاول مرة أخرى" onPress={() => void refetch()} />
        </View>
      </AppScreen>
    );
  }

  const statusLabel = ARABIC_STATUS_LABELS[order.status] ?? order.status;
  const currentIndex = STATUS_PROGRESSION.indexOf(order.status);

  return (
    <AppScreen>
      <BrandHeader title="تتبع الطلب" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Tracker Hero (Matching SOURCE) */}
        <Surface style={styles.heroCard}>
          <Text
            style={[
              styles.heroTitle,
              { color: colors.foreground, fontFamily: theme.typography.headingMedium.fontFamily },
            ]}
          >
            {statusLabel}
          </Text>
          <Text
            style={[
              styles.heroSubtitle,
              { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
            ]}
          >
            رقم الطلب {order.id.slice(0, 8)}... · {formatDateTime(order.createdAt)}
          </Text>

          {/* 4 Step Progress Row */}
          {!['cancelled', 'expired', 'rejected'].includes(order.status) ? (
            <View style={styles.progressRow}>
              {TRACKING_STEPS.map((step, idx) => {
                const targetIdx = STATUS_PROGRESSION.indexOf(step.status);
                const isComplete = currentIndex >= targetIdx;
                return (
                  <View key={step.status} style={styles.progressStep}>
                    <View
                      style={[
                        styles.progressDot,
                        {
                          backgroundColor: isComplete ? colors.primary : colors.muted,
                          borderColor: isComplete ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {idx === 3 ? (
                        <Icon
                          name="Check"
                          size={15}
                          color={isComplete ? colors.primaryForeground : colors.mutedForeground}
                        />
                      ) : (
                        <View
                          style={[
                            styles.innerDot,
                            { backgroundColor: isComplete ? colors.primaryForeground : colors.mutedForeground },
                          ]}
                        />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.progressLabel,
                        {
                          color: isComplete ? colors.foreground : colors.mutedForeground,
                          fontFamily: theme.typography.caption.fontFamily,
                          fontWeight: isComplete ? '700' : '500',
                        },
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </Surface>

        {/* Assigned Driver Card */}
        {driverInfo ? (
          <ScopedDriverCard status={order.status} driverInfo={driverInfo} />
        ) : null}

        {/* Store & Items Card */}
        <Surface style={styles.itemsCard}>
          <View style={styles.cardHeaderLine}>
            <Icon name="Utensils" size={19} color={colors.secondaryForeground} />
            <Text
              style={[
                styles.cardStoreName,
                { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
              ]}
            >
              {order.storeName}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text
                  style={[
                    styles.itemName,
                    { color: colors.foreground, fontFamily: theme.typography.bodyMedium.fontFamily },
                  ]}
                >
                  {item.quantity} × {item.productName}
                  {item.variantName ? ` (${item.variantName})` : ''}
                </Text>
                {item.addonSnapshots.map((addon) => (
                  <Text
                    key={addon.addonId}
                    style={[
                      styles.addonText,
                      { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
                    ]}
                  >
                    + {addon.name} ({formatCurrency(addon.price)})
                  </Text>
                ))}
              </View>
              <Text
                style={[
                  styles.itemPrice,
                  { color: colors.foreground, fontFamily: theme.typography.price.fontFamily },
                ]}
              >
                {formatCurrency(item.subtotal)}
              </Text>
            </View>
          ))}
        </Surface>

        {/* Payment Summary Card */}
        <Surface style={styles.summaryCard}>
          <Text
            style={[
              styles.cardSectionTitle,
              { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
            ]}
          >
            ملخص الدفع
          </Text>
          <View style={styles.priceLine}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>قيمة الطلب</Text>
            <Text style={[styles.priceValue, { color: colors.foreground }]}>{formatCurrency(order.subtotalAmount)}</Text>
          </View>
          {order.discountAmount > 0 ? (
            <View style={styles.priceLine}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>
                خصم الكوبون {order.couponCode ? `(${order.couponCode})` : ''}
              </Text>
              <Text style={[styles.priceValue, { color: colors.secondaryForeground }]}>
                − {formatCurrency(order.discountAmount)}
              </Text>
            </View>
          ) : null}
          <View style={styles.priceLine}>
            <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>رسوم التوصيل</Text>
            <Text style={[styles.priceValue, { color: colors.foreground }]}>
              {order.deliveryFee > 0 ? formatCurrency(order.deliveryFee) : 'مجاناً'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.priceLine}>
            <Text
              style={[
                styles.totalLabel,
                { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
              ]}
            >
              الإجمالي
            </Text>
            <Text
              style={[
                styles.totalValue,
                { color: colors.foreground, fontFamily: theme.typography.price.fontFamily },
              ]}
            >
              {formatCurrency(order.totalAmount)}
            </Text>
          </View>
          <Text style={[styles.paymentMethodText, { color: colors.mutedForeground }]}>
            طريقة الدفع: الدفع عند الاستلام
          </Text>
        </Surface>

        {/* Delivery Address Card */}
        <Surface style={styles.addressCard}>
          <View style={styles.cardHeaderLine}>
            <Icon name="MapPin" size={19} color={colors.secondaryForeground} />
            <Text
              style={[
                styles.cardStoreName,
                { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
              ]}
            >
              عنوان التوصيل
            </Text>
          </View>
          <Text style={[styles.addressText, { color: colors.mutedForeground }]}>
            {order.deliveryAddressSnapshot}
          </Text>
          {order.deliveryAddressLabel ? (
            <Text style={[styles.addressLabel, { color: colors.primary }]}>
              {order.deliveryAddressLabel}
            </Text>
          ) : null}
        </Surface>

        {/* Cancel Button */}
        {isCancellable ? (
          <PrimaryButton
            title="إلغاء الطلب"
            tone="outline"
            icon="close-circle-outline"
            loading={cancelMutation.isPending}
            onPress={() => setCancelConfirmVisible(true)}
            testID="cancel-order"
          />
        ) : null}

        {/* Terminal Actions */}
        {isTerminal ? (
          <View style={styles.terminalActions}>
            <PrimaryButton
              title="اطلب مرة أخرى"
              icon="refresh"
              onPress={() => void reorder(order)}
            />
            <PrimaryButton
              title="إخفاء من السجل"
              tone="outline"
              icon="trash-outline"
              onPress={() => setHideConfirmVisible(true)}
            />
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        visible={cancelConfirmVisible}
        title="إلغاء هذا الطلب؟"
        message="هل أنت متأكد من إلغاء هذا الطلب؟ سيتم إيقاف معالجته فوراً."
        confirmLabel="إلغاء الطلب"
        cancelLabel="الاحتفاظ بالطلب"
        destructive
        onConfirm={() => {
          setCancelConfirmVisible(false);
          cancelMutation.mutate();
        }}
        onCancel={() => setCancelConfirmVisible(false)}
      />

      <ConfirmDialog
        visible={hideConfirmVisible}
        title="إخفاء من السجل؟"
        message="سيتم إخفاء هذا الطلب من سجلك مع حفظ بياناته بشكل آمن."
        confirmLabel="إخفاء"
        cancelLabel="إلغاء"
        destructive
        onConfirm={() => {
          setHideConfirmVisible(false);
          void hideOrder();
        }}
        onCancel={() => setHideConfirmVisible(false)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 112,
    gap: 14,
  },
  errorContent: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    gap: 16,
  },
  heroCard: {
    alignItems: 'center',
    padding: 18,
    gap: 6,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  progressRow: {
    flexDirection: 'row-reverse',
    marginTop: 16,
    gap: 4,
    alignSelf: 'stretch',
  },
  progressStep: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  itemsCard: {
    gap: 10,
  },
  cardHeaderLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  cardStoreName: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemName: {
    fontSize: 13,
    textAlign: 'right',
  },
  addonText: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCard: {
    gap: 10,
  },
  priceLine: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    textAlign: 'right',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  paymentMethodText: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  addressCard: {
    gap: 8,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'right',
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
  },
  terminalActions: {
    gap: 10,
    marginTop: 4,
  },
});
