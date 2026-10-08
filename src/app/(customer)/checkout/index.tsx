import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { useColors } from '@/shared/ui/theme';
import { Button } from '@/shared/ui/components/Button';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { Icon } from '@/shared/ui/components/Icon';
import { AppScreen, BrandHeader, PrimaryButton, Surface } from '@/shared/ui/components/AppUI';
import { showAlert } from '@/shared/utils/alert';
import { formatCurrencyCompact } from '@/shared/utils/formatting';

const addressRepository: AddressRepository = new SupabaseAddressRepository();
const couponRepository: CouponRepository = new SupabaseCouponRepository();
const orderRepository: OrderRepository = new SupabaseOrderRepository();

const DELIVERY_FEE = 0; // fixed at 0 in the foundation phase (Principle IX)

/**
 * الدفع (Phase 3 design): delivery address, coupon, order summary, and the
 * confirm CTA — themed in the app identity. All order logic (mutations,
 * address selection, coupon validation) is carried over unchanged; the
 * server remains the final authority on every amount.
 */
export default function CheckoutScreen() {
  // Protected screen: guests are redirected to login with returnTo (FR-003).
  useRequireAuth('/(customer)/checkout');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const colors = useColors();
  const styles = createStyles(theme);
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
        variantId: item.variantId,
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
        result.isValid ? null : (result.rejectionReason ?? 'تعذر تطبيق الكوبون.'),
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
      if (!effectiveAddress) throw new Error('اختر عنوان التوصيل أولاً.');
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
      showAlert('فشل تأكيد الطلب', error.message);
    },
  });

  const total = subtotal - couponDiscount + DELIVERY_FEE;

  if (items.length === 0 || !storeId) {
    return (
      <AppScreen>
        <BrandHeader title="الدفع" onBack={() => router.back()} />
        <EmptyState
          emoji="🛒"
          title="مفيش حاجة للدفع"
          message="السلة فاضية. ضيف منتجات من متجر أولاً."
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BrandHeader title="الدفع" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery address */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>عنوان التوصيل</Text>
        <TouchableOpacity
          style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => setAddressModalVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="اختيار عنوان التوصيل"
        >
          <View style={[styles.addressIconWrap, { backgroundColor: colors.secondary }]}>
            <Icon name="MapPin" size={20} color={colors.secondaryForeground} />
          </View>
          <View style={styles.addressTexts}>
            {effectiveAddress ? (
              <>
                <Text style={[styles.addressLabel, { color: colors.foreground }]} numberOfLines={1}>
                  {effectiveAddress.label}
                  {effectiveAddress.isDefault ? ' (افتراضي)' : ''}
                </Text>
                <Text style={[styles.addressText, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {effectiveAddress.addressText}
                </Text>
              </>
            ) : (
              <Text style={[styles.addressText, { color: colors.mutedForeground }]}>اختر عنوان التوصيل</Text>
            )}
            <Text style={[styles.addressChange, { color: colors.primary }]}>اضغط للتغيير</Text>
          </View>
          <Icon name="ChevronLeft" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>

        {/* Coupon */}
        <CouponInputSection
          appliedCode={appliedCouponCode}
          discountAmount={couponDiscount}
          rejectionReason={couponRejection}
          isValidating={validateCouponMutation.isPending}
          onApply={(code) => validateCouponMutation.mutate(code)}
          onRemove={handleRemoveCoupon}
        />

        {/* Order summary */}
        <Surface style={styles.summaryCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ملخص الطلب</Text>
          <Text style={[styles.storeLine, { color: colors.mutedForeground }]} numberOfLines={1}>
            من {storeName}
          </Text>
          {items.map((item) => (
            <Text key={item.id} style={[styles.itemLine, { color: colors.foreground }]} numberOfLines={1}>
              {item.quantity} × {item.productName}
              {item.variantName ? ` (${item.variantName})` : ''}
              {item.selectedAddOns.length > 0
                ? ` + ${item.selectedAddOns.map((a) => a.name).join('، ')}`
                : ''}
            </Text>
          ))}
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>قيمة الطلب</Text>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>{formatCurrencyCompact(subtotal)}</Text>
          </View>
          {couponDiscount > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>خصم الكوبون</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                − {formatCurrencyCompact(couponDiscount)}
              </Text>
            </View>
          ) : null}
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>رسوم التوصيل</Text>
            <Text style={[styles.summaryValue, styles.freeValue]}>مجاناً</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>الإجمالي (الدفع عند الاستلام)</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>{formatCurrencyCompact(total)}</Text>
          </View>
        </Surface>

        <PrimaryButton
          title="تأكيد الطلب"
          icon="checkmark-circle-outline"
          onPress={() => placeOrderMutation.mutate()}
          loading={placeOrderMutation.isPending}
          disabled={!effectiveAddress}
          testID="checkout-confirm"
        />
      </ScrollView>

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
    </AppScreen>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
      textAlign: 'right',
    },
    addressCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: theme.spacing.md,
      flexDirection: 'row-reverse',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    addressIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addressTexts: {
      flex: 1,
      alignItems: 'flex-end',
      gap: 2,
    },
    addressLabel: {
      ...theme.typography.label,
      color: theme.colors.textPrimary,
      textAlign: 'right',
    },
    addressText: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      textAlign: 'right',
    },
    addressChange: {
      ...theme.typography.caption,
      color: theme.colors.primary,
      fontWeight: '700',
      marginTop: theme.spacing.xs,
      textAlign: 'right',
    },
    summaryDivider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 4,
    },
    addressChevron: {
      fontSize: 18,
      color: theme.colors.textMuted,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.extraLarge,
      borderWidth: 1,
      borderColor: theme.colors.divider,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    storeLine: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
      textAlign: 'right',
    },
    itemLine: {
      ...theme.typography.caption,
      color: theme.colors.textPrimary,
      textAlign: 'right',
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    summaryLabel: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
    },
    summaryValue: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textPrimary,
      fontWeight: '600',
    },
    discountValue: {
      color: theme.colors.success,
      fontWeight: '700',
    },
    freeValue: {
      color: theme.colors.success,
      fontWeight: '700',
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.divider,
      paddingTop: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    totalLabel: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
    },
    totalValue: {
      ...theme.typography.headingSmall,
      color: theme.colors.secondary,
    },
    placeOrderButton: {
      alignSelf: 'stretch',
    },
  });
