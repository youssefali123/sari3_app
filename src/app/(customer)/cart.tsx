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
import { Button } from '@/shared/ui/components/Button';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { formatCurrency } from '@/shared/utils/formatting';

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const items = useAppSelector(selectCartItems);
  const storeName = useAppSelector(selectCartStoreName);
  const subtotal = useAppSelector(selectCartSubtotal);

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          title="Your cart is empty"
          message="Browse stores and add items to get started."
          emoji="🛒"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          storeName ? <Text style={styles.storeName}>Ordering from {storeName}</Text> : null
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
          <View style={styles.footer}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalValue}>{formatCurrency(subtotal)}</Text>
            </View>
            <Button
              title="Proceed to Checkout"
              onPress={() => {
                // Protected action (FR-003): guests are captured with a
                // returnTo param; the guest cart is never touched.
                if (!user) {
                  router.push({
                    pathname: '/(auth)/login',
                    params: { returnTo: '/(customer)/checkout' },
                  });
                  return;
                }
                router.push('/(customer)/checkout');
              }}
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
      <StoreConflictModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  storeName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  footer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subtotalLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  subtotalValue: {
    ...typography.h3,
    color: colors.textPrimary,
  },
});
