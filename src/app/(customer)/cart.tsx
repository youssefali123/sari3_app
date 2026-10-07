import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { CartItemRow } from '@/features/cart/presentation/CartItemRow';
import { StoreConflictModal } from '@/features/cart/presentation/StoreConflictModal';
import {
  removeItem,
  selectCartItems,
  selectCartStoreName,
  selectCartSubtotal,
  updateQuantity,
} from '@/features/cart/application/cartSlice';
import { useAppDispatch, useAppSelector } from '@/shared/lib/store';
import { useColors, useTheme } from '@/shared/ui/theme';
import { AppHeader } from '@/shared/ui/components/AppHeader';
import { EmptyState } from '@/shared/ui/components/AppUI';
import { PrimaryButton, Surface } from '@/shared/ui/components/AppUI';
import { StickyBar } from '@/shared/ui/components/StickyBar';
import { formatCurrencyCompact } from '@/shared/utils/formatting';

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = useColors();
  const styles = createStyles(theme);
  const items = useAppSelector(selectCartItems);
  const storeName = useAppSelector(selectCartStoreName);
  const subtotal = useAppSelector(selectCartSubtotal);

  const proceedToCheckout = () => {
    if (!user) {
      router.push({
        pathname: '/(auth)/login',
        params: { returnTo: '/(customer)/checkout' },
      });
      return;
    }
    router.push('/(customer)/checkout');
  };

  if (items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader title="سلة الطلبات" subtitle="راجع طلبك قبل التأكيد" />
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
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="سلة الطلبات" subtitle="راجع طلبك قبل التأكيد" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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

      <StickyBar>
        <PrimaryButton
          title={`متابعة الطلب · ${formatCurrencyCompact(subtotal)}`}
          icon="checkmark-circle-outline"
          onPress={proceedToCheckout}
          testID="proceed-to-checkout"
        />
      </StickyBar>

      <StoreConflictModal />
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
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
