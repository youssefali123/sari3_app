import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  selectCartConflict,
  confirmBatchReplace,
  dismissConflict,
} from '../application/cartSlice';
import { useAddToCart } from '../application/useAddToCart';
import { useAppDispatch, useAppSelector } from '@/shared/lib/store';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { Button } from '@/shared/ui/components/Button';

/**
 * Confirmation prompt when adding an item — or an "Order Again" batch — from
 * a different store than the current cart contents. No silent replacement
 * (BR-002, BR-010, SC-003).
 */
export function StoreConflictModal() {
  const conflict = useAppSelector(selectCartConflict);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { confirmConflictResolution, declineConflictResolution } = useAddToCart();

  const pending = conflict.pendingItem;
  const pendingBatch = conflict.pendingBatch;
  const isBatch = Boolean(pendingBatch);

  const handleConfirm = () => {
    if (pendingBatch) {
      dispatch(confirmBatchReplace());
      // Order Again hand-off: standard checkout for explicit confirmation.
      router.push('/(customer)/checkout');
    } else {
      confirmConflictResolution();
    }
  };

  const handleDecline = () => {
    if (pendingBatch) {
      dispatch(dismissConflict());
    } else {
      declineConflictResolution();
    }
  };

  const incomingStore = pendingBatch?.storeName ?? pending?.storeName;

  return (
    <Modal visible={conflict.isOpen} transparent animationType="fade" onRequestClose={handleDecline}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Replace cart items?</Text>
          <Text style={styles.message}>
            {incomingStore
              ? `Your cart contains items from another store. Replace them with ${
                  isBatch ? 'items' : 'an item'
                } from ${incomingStore}?`
              : 'Your cart contains items from another store. Replace them?'}
          </Text>
          <View style={styles.buttons}>
            <Button
              title="Keep current cart"
              variant="outline"
              onPress={handleDecline}
              style={styles.button}
            />
            <Button
              title="Replace cart"
              onPress={handleConfirm}
              style={styles.button}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  storeName: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
});
