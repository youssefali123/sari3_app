import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SavedDeliveryAddress } from '../domain/entities/SavedDeliveryAddress';
import { AddressCard } from './AddressCard';
import { Button } from '@/shared/ui/components/Button';
import { Input } from '@/shared/ui/components/Input';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface AddressSelectionModalProps {
  visible: boolean;
  addresses: SavedDeliveryAddress[] | undefined;
  isLoading?: boolean;
  selectedId: string | null;
  onSelect: (address: SavedDeliveryAddress) => void;
  onClose: () => void;
  onAddNew: (input: { label: string; addressText: string; isDefault?: boolean }) => Promise<void>;
}

/**
 * Modal for choosing a saved delivery address at checkout, or adding a
 * new one inline (FR-016).
 */
export function AddressSelectionModal({
  visible,
  addresses,
  isLoading,
  selectedId,
  onSelect,
  onClose,
  onAddNew,
}: AddressSelectionModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [addressText, setAddressText] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAddNew() {
    if (!label.trim() || !addressText.trim()) {
      setFormError('Label and address are required.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await onAddNew({ label: label.trim(), addressText: addressText.trim() });
      setLabel('');
      setAddressText('');
      setShowForm(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save address.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Select delivery address</Text>

          {showForm ? (
            <View>
              <Input
                label="Label (e.g. Home, Work)"
                value={label}
                onChangeText={setLabel}
                placeholder="Home"
              />
              <Input
                label="Full address"
                value={addressText}
                onChangeText={setAddressText}
                placeholder="Street, building, floor, landmark…"
                multiline
              />
              {formError ? <Text style={styles.formError}>{formError}</Text> : null}
              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    setShowForm(false);
                    setFormError(null);
                  }}
                />
                <Button title="Save" onPress={handleAddNew} loading={saving} />
              </View>
            </View>
          ) : isLoading ? (
            <LoadingSpinner />
          ) : !addresses || addresses.length === 0 ? (
            <EmptyState
              title="No saved addresses"
              message="Add a delivery address to continue."
              emoji="📍"
            />
          ) : (
            <FlatList
              data={addresses}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <AddressCard
                  address={item}
                  selected={item.id === selectedId}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                />
              )}
            />
          )}

          {!showForm ? (
            <View style={styles.footer}>
              <Button title="+ Add New Address" variant="outline" onPress={() => setShowForm(true)} />
              <Button title="Done" onPress={onClose} />
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  formError: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});
