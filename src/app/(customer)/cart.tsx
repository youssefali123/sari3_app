import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { CartItemRow } from '@/features/cart/presentation/CartItemRow';
import { StoreConflictModal } from '@/features/cart/presentation/StoreConflictModal';
import {
  removeItem,
  selectCartItemCount,
  selectCartItems,
  selectCartStoreName,
  selectCartSubtotal,
  updateQuantity,
} from '@/features/cart/application/cartSlice';
import { useAppDispatch, useAppSelector } from '@/shared/lib/store';
import { useColors } from '@/shared/ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreen, BrandHeader, EmptyState, PrimaryButton, Surface } from '@/shared/ui/components/AppUI';
import { StickyBar } from '@/shared/ui/components/StickyBar';
import { formatCurrencyCompact } from '@/shared/utils/formatting';

export default function CartScreen() {
  const router = useAppRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const colors = useColors();
  const items = useAppSelector(selectCartItems);
  const storeName = useAppSelector(selectCartStoreName);
  const subtotal = useAppSelector(selectCartSubtotal);
  const itemCount = useAppSelector(selectCartItemCount);

  const tabBarHeight = 74 + Math.max(insets.bottom, 12);

  const proceedToCheckout = () => {
    if (!user) {
      router.push({
        pathname: '/(auth)/login',
        params: { returnTo: '/checkout' },
      });
      return;
    }
    router.push('/checkout');
  };

  if (items.length === 0) {
    return (
      <AppScreen>
        <BrandHeader title="سلة الطلبات" subtitle="راجع طلبك قبل التأكيد" />
        <View style={styles.emptyContainer}>
          <EmptyState
            title="سلتك فارغة"
            message="اختر وجبتك المفضلة من المطاعم القريبة."
            icon="bag-handle-outline"
          />
          <View style={styles.browseButtonWrap}>
            <PrimaryButton
              title="تصفح المتاجر"
              icon="basket-outline"
              onPress={() => router.push('/')}
            />
          </View>
        </View>
      </AppScreen>
    );
  }

  const subtitle = `${itemCount} ${itemCount === 1 ? 'صنف' : itemCount === 2 ? 'صنفان' : 'أصناف'}`;

  return (
    <AppScreen>
      <BrandHeader title="سلة الطلبات" subtitle={subtitle} />
      <FlatList
        style={styles.container}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 70 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          storeName ? (
            <Text style={[styles.storeLine, { color: colors.mutedForeground }]} numberOfLines={1}>
              الطلب من متجر {storeName}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <CartItemRow
            item={item}
            onUpdateQuantity={(cartItemId, quantity) =>
              dispatch(updateQuantity({ cartItemId, quantity }))
            }
            onRemove={(cartItemId) => dispatch(removeItem(cartItemId))}
          />
        )}
        ListFooterComponent={
          <Surface style={styles.totalsCard}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
                قيمة الطلب
              </Text>
              <Text style={[styles.totalValue, { color: colors.foreground }]}>
                {formatCurrencyCompact(subtotal)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>
                الإجمالي
              </Text>
              <Text style={[styles.grandTotalValue, { color: colors.foreground }]}>
                {formatCurrencyCompact(subtotal)}
              </Text>
            </View>
            <Text style={[styles.deliveryNote, { color: colors.mutedForeground }]}>
              رسوم التوصيل تُحسب عند تأكيد العنوان
            </Text>
          </Surface>
        }
      />

      <StickyBar bottomOffset={tabBarHeight}>
        <PrimaryButton
          title={`متابعة الطلب · ${formatCurrencyCompact(subtotal)}`}
          icon="checkmark-circle-outline"
          onPress={proceedToCheckout}
          testID="proceed-to-checkout"
        />
      </StickyBar>

      <StoreConflictModal />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      padding: 18,
      justifyContent: 'center',
      gap: 16,
    },
    browseButtonWrap: {
      alignSelf: 'stretch',
    },
    listContent: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 130,
      gap: 11,
    },
    storeLine: {
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'right',
      marginBottom: 4,
    },
    totalsCard: {
      gap: 10,
      marginTop: 8,
    },
    totalRow: {
      flexDirection: 'row-reverse',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryDivider: {
      height: StyleSheet.hairlineWidth,
      marginVertical: 2,
    },
    totalLabel: {
      fontSize: 13,
      textAlign: 'right',
    },
    totalValue: {
      fontSize: 14,
      fontWeight: '700',
    },
    grandTotalLabel: {
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'right',
    },
    grandTotalValue: {
      fontSize: 17,
      fontWeight: '800',
    },
    deliveryNote: {
      fontSize: 11,
      textAlign: 'center',
      marginTop: 4,
    },
  });
