import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AddressRepository } from '@/features/addresses/domain/repositories/AddressRepository';
import { SupabaseAddressRepository } from '@/features/addresses/infrastructure/SupabaseAddressRepository';
import { AddressSelectionModal } from '@/features/addresses/presentation/AddressSelectionModal';
import { SavedDeliveryAddress } from '@/features/addresses/domain/entities/SavedDeliveryAddress';
import { CouponRepository } from '@/features/promotions/domain/repositories/CouponRepository';
import { SupabaseCouponRepository } from '@/features/promotions/infrastructure/SupabaseCouponRepository';
import { CouponInputSection } from '@/features/promotions/presentation/CouponInputSection';
import { OrderRepository } from '@/features/orders/domain/repositories/OrderRepository';
import { maybePromptAndRegister } from '@/features/notifications/application/hooks/useNotificationPermission';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';
import {
  clearCart,
  selectCartItems,
  selectCartStoreId,
  selectCartStoreName,
  selectCartSubtotal,
} from '@/features/cart/application/cartSlice';
import { useAppDispatch, useAppSelector } from '@/shared/lib/store';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { Button } from '@/shared/ui/components/Button';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency } from '@/shared/utils/formatting';

const addressRepository: AddressRepository = new SupabaseAddressRepository();
const couponRepository: CouponRepository = new SupabaseCouponRepository();
const orderRepository: OrderRepository = new SupabaseOrderRepository();

const DELIVERY_FEE = 0; // fixed at 0 in the foundation phase (Principle IX)

export default function CheckoutScreen() {
  // Protected screen: guests are redirected to login with returnTo (FR-003).
  useRequireAuth('/(customer)/checkout');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const customerId = useCurrentCustomerId();

  const items = useAppSelector(selectCartItems);
  const storeId = useAppSelector(selectCartStoreId);
  const storeName = useAppSelector(selectCartStoreName);
  const subtotal = useAppSelector(selectCartSubtotal);

  const [selectedAddress, setSelectedAddress] = useState<SavedDeliveryAddress | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponRejection, setCouponRejection] = useState<string | null>(null);

  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['addresses', customerId],
    queryFn: () => addressRepository.getAddresses(customerId!),
    enabled: Boolean(customerId),
  });

  // Default address is pre-selected once loaded.
  const effectiveAddress = useMemo(() => {
    if (selectedAddress) return selectedAddress;
    return addresses?.find((a) => a.isDefault) ?? null;
  }, [selectedAddress, addresses]);

  const rpcItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        addonIds: item.addonIds,
      })),
    [items],
  );

  const validateCouponMutation = useMutation({
    mutationFn: (code: string) =>
      couponRepository.validateCoupon({
        code,
        storeId: storeId!,
        items: rpcItems,
        customerId: customerId!,
      }),
    onSuccess: (result, code) => {
      // Single coupon per order: a new code replaces the previous one (BR-004).
      setAppliedCouponCode(result.isValid ? code : null);
      setCouponDiscount(result.isValid ? result.discountAmount : 0);
      setCouponRejection(
        result.isValid ? null : (result.rejectionReason ?? 'Coupon could not be applied.'),
      );
    },
    onError: (error: Error) => {
      setCouponRejection(error.message);
    },
  });

  function handleRemoveCoupon() {
    setAppliedCouponCode(null);
    setCouponDiscount(0);
    setCouponRejection(null);
  }

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveAddress) throw new Error('Select a delivery address first.');
      return orderRepository.placeOrder({
        storeId: storeId!,
        deliveryAddressId: effectiveAddress.id,
        paymentMethod: 'cash_on_delivery',
        couponCode: appliedCouponCode,
        items: rpcItems,
      });
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      dispatch(clearCart());
      // Contextual permission prompt (FR-013): first successful order only.
      maybePromptAndRegister(order.customerId).catch(() => undefined);
      router.replace(`/(customer)/orders/${order.id}`);
    },
    onError: (error: Error) => {
      Alert.alert('Order failed', error.message);
    },
  });

  const total = subtotal - couponDiscount + DELIVERY_FEE;

  if (items.length === 0 || !storeId) {
    return (
      <EmptyState
        title="Nothing to check out"
        message="Your cart is empty. Add items from a store first."
        emoji="🛒"
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Delivery address</Text>
      <TouchableOpacity style={styles.addressCard} onPress={() => setAddressModalVisible(true)} activeOpacity={0.8}>
        {effectiveAddress ? (
          <View>
            <Text style={styles.addressLabel}>
              {effectiveAddress.label}
              {effectiveAddress.isDefault ? ' (default)' : ''}
            </Text>
            <Text style={styles.addressText}>{effectiveAddress.addressText}</Text>
          </View>
        ) : (
          <Text style={styles.addressText}>Select delivery address</Text>
        )}
        <Text style={styles.addressChange}>Tap to change</Text>
      </TouchableOpacity>

      <CouponInputSection
        appliedCode={appliedCouponCode}
        discountAmount={couponDiscount}
        rejectionReason={couponRejection}
        isValidating={validateCouponMutation.isPending}
        onApply={(code) => validateCouponMutation.mutate(code)}
        onRemove={handleRemoveCoupon}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order summary</Text>
        <Text style={styles.storeName}>From {storeName}</Text>
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemText} numberOfLines={1}>
              {item.quantity} × {item.productName}
              {item.selectedAddOns.length > 0
                ? ` (+${item.selectedAddOns.map((a) => a.name).join(', ')})`
                : ''}
            </Text>
          </View>
        ))}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
        </View>
        {couponDiscount > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Coupon discount</Text>
            <Text style={[styles.summaryValue, styles.discountValue]}>
              −{formatCurrency(couponDiscount)}
            </Text>
          </View>
        ) : null}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery fee</Text>
          <Text style={styles.summaryValue}>{formatCurrency(DELIVERY_FEE)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total (Cash on Delivery)</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      </View>

      <Button
        title="Place Order"
        onPress={() => placeOrderMutation.mutate()}
        loading={placeOrderMutation.isPending}
        disabled={!effectiveAddress}
      />

      <AddressSelectionModal
        visible={addressModalVisible}
        addresses={addresses}
        isLoading={addressesLoading}
        selectedId={effectiveAddress?.id ?? null}
        onSelect={setSelectedAddress}
        onClose={() => setAddressModalVisible(false)}
        onAddNew={async (input) => {
          const created = await addressRepository.createAddress(customerId!, input);
          queryClient.invalidateQueries({ queryKey: ['addresses'] });
          setSelectedAddress(created);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  addressCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  addressLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  addressText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addressChange: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  storeName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  itemRow: {
    marginBottom: spacing.xs,
  },
  itemText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  summaryLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
  discountValue: {
    color: colors.success,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  totalLabel: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  totalValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});
