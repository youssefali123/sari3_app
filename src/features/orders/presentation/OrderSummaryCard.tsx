import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Order } from '../domain/entities/Order';
import { OrderStatus } from '../domain/entities/OrderStatus';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Icon } from '@/shared/ui/components/Icon';
import { formatCurrency, formatDateTime } from '@/shared/utils/formatting';

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
  OrderStatus.Expired,
  OrderStatus.Rejected,
];

const ARABIC_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  accepted: 'تم التأكيد',
  preparing: 'قيد التجهيز',
  out_for_delivery: 'جاري التوصيل',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
  expired: 'منتهي الصلاحية',
  rejected: 'مرفوض',
};

interface OrderSummaryCardProps {
  order: Order;
  onPress: (orderId: string) => void;
  onOrderAgain?: (order: Order) => void;
  onHide?: (orderId: string) => void;
}

/**
 * Order card matching SOURCE orders list styling:
 * RTL Surface card with 20px radius, store name + chevron, order id + Arabic status pill,
 * item count + formatted total price, and optional terminal actions.
 * Optimized for rapid 60fps list scrolling with zero Reanimated per-item overhead.
 */
export const OrderSummaryCard = React.memo(function OrderSummaryCard({
  order,
  onPress,
  onOrderAgain,
  onHide,
}: OrderSummaryCardProps) {
  const colors = useColors();
  const { theme } = useTheme();

  const isTerminal = TERMINAL_STATUSES.includes(order.status);
  const showActions = isTerminal && (onOrderAgain || onHide);
  const statusLabel = ARABIC_STATUS_LABELS[order.status] ?? order.status;

  const isDelivered = order.status === OrderStatus.Delivered;
  const isBad =
    order.status === OrderStatus.Cancelled ||
    order.status === OrderStatus.Expired ||
    order.status === OrderStatus.Rejected;

  const statusColor = isDelivered
    ? colors.secondaryForeground
    : isBad
      ? colors.destructive
      : colors.primaryPressed;

  const formattedDate = formatDateTime(order.createdAt);
  const formattedTotal = formatCurrency(order.totalAmount);

  return (
    <Pressable
      onPress={() => onPress(order.id)}
      unstable_pressDelay={0}
      accessibilityRole="button"
      accessibilityLabel={`طلب من ${order.storeName}، الحالة: ${statusLabel}`}
      testID={`order-${order.id}`}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={styles.titleLine}>
        <Icon name="ChevronLeft" size={18} color={colors.mutedForeground} />
        <Text
          style={[
            styles.storeName,
            { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
          ]}
          numberOfLines={1}
        >
          {order.storeName}
        </Text>
      </View>

      <View style={styles.metaLine}>
        <Text
          style={[
            styles.smallText,
            { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
          ]}
        >
          {order.id.slice(0, 8)}... · {formattedDate}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.muted }]}>
          <Text
            style={[
              styles.statusText,
              { color: statusColor, fontFamily: theme.typography.caption.fontFamily },
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.priceLine}>
        <Text
          style={[
            styles.smallText,
            { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
          ]}
        >
          {order.items.length} منتجات
        </Text>
        <Text
          style={[
            styles.totalText,
            { color: colors.foreground, fontFamily: theme.typography.price.fontFamily },
          ]}
        >
          {formattedTotal}
        </Text>
      </View>

      {showActions ? (
        <View
          style={[styles.actionRow, { borderTopColor: colors.border }]}
          onStartShouldSetResponder={() => true}
        >
          {onOrderAgain ? (
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => onOrderAgain(order)}
              unstable_pressDelay={0}
              hitSlop={8}
            >
              <Text style={[styles.actionBtnText, { color: colors.primaryForeground }]}>
                اطلب مرة أخرى
              </Text>
            </Pressable>
          ) : null}
          {onHide ? (
            <Pressable
              style={({ pressed }) => [
                styles.hideBtn,
                { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => onHide(order.id)}
              unstable_pressDelay={0}
              hitSlop={8}
            >
              <Text style={[styles.hideBtnText, { color: colors.mutedForeground }]}>
                إخفاء من السجل
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 9,
  },
  titleLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  metaLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallText: {
    fontSize: 11,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  priceLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  totalText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hideBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hideBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
