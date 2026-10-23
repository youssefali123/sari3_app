import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { PrimaryButton, Surface } from '@/shared/ui/components/AppUI';
import { formatCurrency } from '@/shared/utils/formatting';
import { Order } from '@/features/orders/domain/entities/Order';
import { OrderStatus } from '@/features/orders/domain/entities/OrderStatus';
import { classifyDriverError } from '@/features/drivers/infrastructure/driverErrorClassifier';
import { getDriverErrorMessage } from '@/features/drivers/presentation/messages/driversErrorMessages.ar';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'تم التأكيد',
  preparing: 'جاري التجهيز بالمحل',
  ready_for_pickup: 'جاهز للاستلام',
  out_for_delivery: 'جاري التوصيل للعميل',
  delivered: 'تم التسليم بنجاح',
  cancelled: 'تم إلغاء الطلب',
};

interface ActiveOrderCardProps {
  order: Order;
  /** Label of the single allowed next step, or null on terminal status. */
  nextStepLabel: string | null;
  onAdvance: () => void;
  isAdvancing: boolean;
  error?: Error | null;
  /** Shown when the customer cancelled this order (feature 005 US3). */
  customerCancelled?: boolean;
  /** Recovery action after a customer cancellation. */
  onReturnToPool?: () => void;
  /** Self-report release action */
  onRelease?: () => void;
}

/**
 * Visual delivery lifecycle stepper for active driver orders.
 */
function DeliveryStepper({ status }: { status: OrderStatus }) {
  const colors = useColors();
  const { theme } = useTheme();

  // Stage 1: Store preparation / pickup
  const isStep1Done = status === OrderStatus.OutForDelivery || status === OrderStatus.Delivered;
  const isStep1Current = status === OrderStatus.Accepted || status === OrderStatus.Preparing || status === OrderStatus.Pending;

  // Stage 2: In transit to customer
  const isStep2Done = status === OrderStatus.Delivered;
  const isStep2Current = status === OrderStatus.OutForDelivery;

  // Stage 3: Handed over to customer
  const isStep3Done = status === OrderStatus.Delivered;

  const steps = [
    {
      id: 1,
      label: 'استلام المتجر',
      icon: 'ShoppingBag',
      isDone: isStep1Done,
      isCurrent: isStep1Current,
    },
    {
      id: 2,
      label: 'جاري التوصيل',
      icon: 'Bike',
      isDone: isStep2Done,
      isCurrent: isStep2Current,
    },
    {
      id: 3,
      label: 'تسليم العميل',
      icon: 'CheckCircle2',
      isDone: isStep3Done,
      isCurrent: isStep3Done,
    },
  ];

  return (
    <View style={stepperStyles.container}>
      {steps.map((step, idx) => {
        const isCompleted = step.isDone;
        const isCurrent = step.isCurrent;

        const iconBg = isCompleted
          ? colors.primary
          : isCurrent
          ? colors.primarySubtle
          : colors.muted;

        const iconColor = isCompleted
          ? '#1A1D20'
          : isCurrent
          ? colors.primaryPressed
          : colors.mutedForeground;

        const textColor = isCompleted || isCurrent
          ? colors.foreground
          : colors.mutedForeground;

        const showLine = idx < steps.length - 1;
        const lineActive = idx === 0 ? isStep1Done : isStep2Done;

        return (
          <React.Fragment key={step.id}>
            <View style={stepperStyles.stepCol}>
              <View
                style={[
                  stepperStyles.nodeCircle,
                  {
                    backgroundColor: iconBg,
                    borderColor: isCurrent ? colors.primary : 'transparent',
                    borderWidth: isCurrent ? 2 : 0,
                  },
                ]}
              >
                <Icon name={step.icon} size={16} color={iconColor} />
              </View>
              <Text
                style={[
                  stepperStyles.stepLabel,
                  {
                    color: textColor,
                    fontFamily: theme.typography.caption.fontFamily,
                    fontWeight: isCurrent ? '700' : '600',
                  },
                ]}
                numberOfLines={1}
              >
                {step.label}
              </Text>
            </View>

            {showLine ? (
              <View
                style={[
                  stepperStyles.line,
                  {
                    backgroundColor: lineActive ? colors.primary : colors.border,
                  },
                ]}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

/**
 * Full-detail card for the driver's active order.
 * Transferred to SOURCE DriverOrderCard design language:
 * 20px radius Surface card, RTL layout, status pill, delivery location pin, items breakdown,
 * and prominent sequential PrimaryButton.
 */
export function ActiveOrderCard({
  order,
  nextStepLabel,
  onAdvance,
  isAdvancing,
  error,
  customerCancelled,
  onReturnToPool,
  onRelease,
}: ActiveOrderCardProps) {
  const colors = useColors();
  const { theme } = useTheme();

  const isDelivered = order.status === 'delivered';
  const statusText = STATUS_LABELS[order.status] ?? order.status;

  return (
    <Surface style={styles.card}>
      {/* Header with store info & status */}
      <View style={styles.headerRow}>
        <View style={[styles.storeIcon, { backgroundColor: colors.primarySubtle }]}>
          <Icon name="ShoppingBag" size={24} color={colors.primaryPressed} />
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
          <View style={styles.metaRow}>
            <Text
              style={[
                styles.orderId,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              #{order.id.slice(0, 8)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.primarySubtle }]}>
              <Text
                style={[
                  styles.statusText,
                  {
                    color: colors.primaryPressed,
                    fontFamily: theme.typography.caption.fontFamily,
                  },
                ]}
              >
                {statusText}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Visual Delivery Stepper */}
      {!customerCancelled ? (
        <DeliveryStepper status={order.status} />
      ) : null}

      {/* Customer cancellation notice */}
      {customerCancelled && (
        <Surface style={[styles.cancelledNotice, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}>
          <View style={styles.cancelledHeader}>
            <Icon name="XCircle" size={18} color={colors.destructive} />
            <Text style={[styles.cancelledTitle, { color: colors.destructive, fontFamily: theme.typography.headingSmall.fontFamily }]}>
              قام العميل بإلغاء هذا الطلب
            </Text>
          </View>
          <Text style={[styles.cancelledBody, { color: colors.foreground, fontFamily: theme.typography.bodyMedium.fontFamily }]}>
            تم إلغاء التوصيلة من قبل العميل، لن تتمكن من متابعة مراحل التوصيل.
          </Text>
          {onReturnToPool && (
            <PrimaryButton
              title="العودة للطلبات المتاحة"
              icon="arrow-back"
              onPress={onReturnToPool}
            />
          )}
        </Surface>
      )}

      {/* Delivery destination */}
      <View style={[styles.sectionCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.pinBadge, { backgroundColor: colors.primarySubtle }]}>
            <Icon name="MapPin" size={16} color={colors.primaryPressed} />
          </View>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingSmall.fontFamily,
              },
            ]}
          >
            عنوان التوصيل للعميل
          </Text>
        </View>
        <Text
          style={[
            styles.addressText,
            {
              color: colors.foreground,
              fontFamily: theme.typography.bodyMedium.fontFamily,
            },
          ]}
        >
          {order.deliveryAddressSnapshot}
        </Text>
        {order.deliveryAddressLabel ? (
          <Text
            style={[
              styles.addressLabel,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.caption.fontFamily,
              },
            ]}
          >
            ملاحظات: {order.deliveryAddressLabel}
          </Text>
        ) : null}
      </View>

      {/* Items Breakdown */}
      <View style={styles.section}>
        <Text
          style={[
            styles.itemsSectionTitle,
            {
              color: colors.mutedForeground,
              fontFamily: theme.typography.caption.fontFamily,
            },
          ]}
        >
          تفاصيل محتويات الطلب ({order.items.length})
        </Text>
        <View style={styles.itemsList}>
          {order.items.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <Text
                style={[
                  styles.itemQuantity,
                  {
                    color: colors.primaryPressed,
                    fontFamily: theme.typography.bodyMedium.fontFamily,
                  },
                ]}
              >
                {item.quantity}×
              </Text>
              <Text
                style={[
                  styles.itemName,
                  {
                    color: colors.foreground,
                    fontFamily: theme.typography.bodyMedium.fontFamily,
                  },
                ]}
              >
                {item.productName}
              </Text>
              <Text
                style={[
                  styles.itemPrice,
                  {
                    color: colors.foreground,
                    fontFamily: theme.typography.bodyMedium.fontFamily,
                  },
                ]}
              >
                {formatCurrency(item.subtotal)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Financials & Payment note */}
      <View
        style={[
          styles.financialCard,
          {
            backgroundColor: colors.primarySubtle,
            borderColor: 'rgba(245, 189, 22, 0.4)',
          },
        ]}
      >
        <View style={styles.totalRow}>
          <View style={styles.paymentMethod}>
            <View style={[styles.cashIconBadge, { backgroundColor: colors.primary }]}>
              <Icon name="Banknote" size={18} color="#1A1D20" />
            </View>
            <View>
              <Text
                style={[
                  styles.paymentMethodTitle,
                  {
                    color: colors.foreground,
                    fontFamily: theme.typography.bodyMedium.fontFamily,
                  },
                ]}
              >
                المبلغ المطلوب تحصيله (كاش)
              </Text>
              <Text
                style={[
                  styles.paymentMethodSub,
                  {
                    color: colors.mutedForeground,
                    fontFamily: theme.typography.caption.fontFamily,
                  },
                ]}
              >
                الدفع عند الاستلام
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.totalAmount,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingMedium.fontFamily,
              },
            ]}
          >
            {formatCurrency(order.totalAmount)}
          </Text>
        </View>
      </View>

      {error && !customerCancelled ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {getDriverErrorMessage(classifyDriverError(error).kind)}
        </Text>
      ) : null}

      {/* Sequential Action Button */}
      {nextStepLabel && !customerCancelled && !isDelivered && (
        <View style={styles.actionContainer}>
          <PrimaryButton
            title={nextStepLabel}
            icon="bicycle"
            loading={isAdvancing}
            onPress={onAdvance}
          />
        </View>
      )}

      {/* Release order link */}
      {onRelease && !customerCancelled && !isDelivered && (
        <Pressable
          onPress={onRelease}
          unstable_pressDelay={0}
          style={({ pressed }) => [styles.releaseButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text
            style={[
              styles.releaseText,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.caption.fontFamily,
              },
            ]}
          >
            الاعتذار عن مواصلة التوصيل (تحرير الطلب)
          </Text>
        </Pressable>
      )}
    </Surface>
  );
}

const stepperStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginVertical: 4,
  },
  stepCol: {
    alignItems: 'center',
    gap: 6,
    zIndex: 2,
  },
  nodeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  line: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
    marginBottom: 20,
    zIndex: 1,
  },
});

const styles = StyleSheet.create({
  card: {
    gap: 16,
    padding: 18,
    borderRadius: 22,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  orderId: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cancelledNotice: {
    padding: 14,
    borderRadius: 16,
    gap: 8,
  },
  cancelledHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelledBody: {
    fontSize: 12,
    textAlign: 'right',
  },
  sectionCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  pinBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 20,
  },
  addressLabel: {
    fontSize: 12,
    textAlign: 'right',
  },
  section: {
    gap: 8,
  },
  itemsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  itemsList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  itemQuantity: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemName: {
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  financialCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  cashIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentMethodTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  paymentMethodSub: {
    fontSize: 11,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
  },
  actionContainer: {
    marginTop: 4,
  },
  releaseButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  releaseText: {
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
