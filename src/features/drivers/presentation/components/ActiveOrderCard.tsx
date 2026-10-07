import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useColors } from '@/shared/ui/hooks/useColors';
import { Icon } from '@/shared/ui/components/Icon';
import { PrimaryButton, Surface } from '@/shared/ui/components/AppUI';
import { formatCurrency } from '@/shared/utils/formatting';
import { Order } from '@/features/orders/domain/entities/Order';

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

  const isDelivered = order.status === 'delivered';
  const statusText = STATUS_LABELS[order.status] ?? order.status;

  return (
    <Surface style={styles.card}>
      {/* Header with store info & status */}
      <View style={styles.headerRow}>
        <View style={[styles.storeIcon, { backgroundColor: colors.muted }]}>
          <Icon name="ShoppingBag" size={24} color={colors.foreground} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.storeName, { color: colors.foreground }]}>
            {order.storeName}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.orderId, { color: colors.mutedForeground }]}>
              #{order.id.slice(0, 8)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.statusText, { color: colors.secondaryForeground }]}>
                {statusText}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Customer cancellation notice */}
      {customerCancelled && (
        <Surface style={[styles.cancelledNotice, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}>
          <View style={styles.cancelledHeader}>
            <Icon name="XCircle" size={18} color={colors.destructive} />
            <Text style={[styles.cancelledTitle, { color: colors.destructive }]}>
              قام العميل بإلغاء هذا الطلب
            </Text>
          </View>
          <Text style={[styles.cancelledBody, { color: colors.foreground }]}>
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
      <View style={[styles.sectionCard, { backgroundColor: colors.muted }]}>
        <View style={styles.sectionHeader}>
          <Icon name="MapPin" size={17} color={colors.secondaryForeground} />
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            عنوان التوصيل للعميل
          </Text>
        </View>
        <Text style={[styles.addressText, { color: colors.foreground }]}>
          {order.deliveryAddressSnapshot}
        </Text>
        {order.deliveryAddressLabel ? (
          <Text style={[styles.addressLabel, { color: colors.mutedForeground }]}>
            ملاحظات: {order.deliveryAddressLabel}
          </Text>
        ) : null}
      </View>

      {/* Items Breakdown */}
      <View style={styles.section}>
        <Text style={[styles.itemsSectionTitle, { color: colors.mutedForeground }]}>
          تفاصيل محتويات الطلب ({order.items.length})
        </Text>
        <View style={styles.itemsList}>
          {order.items.map((item) => (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.itemQuantity, { color: colors.secondaryForeground }]}>
                {item.quantity}×
              </Text>
              <Text style={[styles.itemName, { color: colors.foreground }]}>
                {item.productName}
              </Text>
              <Text style={[styles.itemPrice, { color: colors.foreground }]}>
                {formatCurrency(item.subtotal)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Financials & Payment note */}
      <View style={[styles.financialCard, { backgroundColor: colors.secondary }]}>
        <View style={styles.totalRow}>
          <View style={styles.paymentMethod}>
            <Icon name="Banknote" size={18} color={colors.secondaryForeground} />
            <Text style={[styles.paymentMethodText, { color: colors.secondaryForeground }]}>
              المبلغ المطلوب تحصيله (كاش)
            </Text>
          </View>
          <Text style={[styles.totalAmount, { color: colors.secondaryForeground }]}>
            {formatCurrency(order.totalAmount)}
          </Text>
        </View>
      </View>

      {error && !customerCancelled ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error.message}
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
          style={({ pressed }) => [styles.releaseButton, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.releaseText, { color: colors.mutedForeground }]}>
            الاعتذار عن مواصلة التوصيل (تحرير الطلب)
          </Text>
        </Pressable>
      )}
    </Surface>
  );
}

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
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
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
  },
  totalRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 17,
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
