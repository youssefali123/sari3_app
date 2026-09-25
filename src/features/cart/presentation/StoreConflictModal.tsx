import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { selectCartConflict } from '../application/cartSlice';
import { useAddToCart } from '../application/useAddToCart';
import { useAppSelector } from '@/shared/lib/store';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { Button } from '@/shared/ui/components/Button';

/**
 * Confirmation prompt when adding an item from a different store than the
 * current cart contents. No silent replacement (BR-002, BR-010, SC-003).
 */
export function StoreConflictModal() {
  const conflict = useAppSelector(selectCartConflict);
  const { confirmConflictResolution, declineConflictResolution } = useAddToCart();

  const pending = conflict.pendingItem;

  return (
    <Modal visible={conflict.isOpen} transparent animationType="fade" onRequestClose={declineConflictResolution}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>Replace cart items?</Text>
          <Text style={styles.message}>
            {pending
              ? `Your cart contains items from another store. Replace them with an item from ${pending.storeName}?`
              : 'Your cart contains items from another store. Replace them?'}
          </Text>
          <View style={styles.buttons}>
            <Button
              title="Keep current cart"
              variant="outline"
              onPress={declineConflictResolution}
              style={styles.button}
            />
            <Button
              title="Replace cart"
              onPress={confirmConflictResolution}
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
