import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SavedDeliveryAddress } from '@/features/addresses/domain/entities/SavedDeliveryAddress';
import { AddressRepository } from '@/features/addresses/domain/repositories/AddressRepository';
import { SupabaseAddressRepository } from '@/features/addresses/infrastructure/SupabaseAddressRepository';
import { AddressCard } from '@/features/addresses/presentation/AddressCard';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { Button } from '@/shared/ui/components/Button';
import { Input } from '@/shared/ui/components/Input';
import { LoadingSpinner } from '@/shared/ui/components/LoadingSpinner';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { EmptyState } from '@/shared/ui/components/EmptyState';
import { colors } from '@/shared/ui/theme/colors';
import { borderRadius, spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

const addressRepository: AddressRepository = new SupabaseAddressRepository();

interface EditingState {
  address: SavedDeliveryAddress | null; // null = creating a new address
}

export default function SavedAddressesScreen() {
  useRequireAuth('/(customer)/addresses');
  const customerId = useCurrentCustomerId();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [label, setLabel] = useState('');
  const [addressText, setAddressText] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    data: addresses,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['addresses', customerId],
    queryFn: () => addressRepository.getAddresses(customerId!),
    enabled: Boolean(customerId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['addresses'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error('Not signed in');
      if (!label.trim() || !addressText.trim()) {
        throw new Error('Label and address are required.');
      }
      const input = {
        label: label.trim(),
        addressText: addressText.trim(),
        isDefault,
      };
      if (editing?.address) {
        await addressRepository.updateAddress(editing.address.id, input);
      } else {
        await addressRepository.createAddress(customerId, input);
      }
    },
    onSuccess: () => {
      invalidate();
      closeForm();
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => addressRepository.deleteAddress(id),
    onSuccess: invalidate,
    onError: (error: Error) =>
      Alert.alert('Could not delete address', error.message),
  });

  function openCreate() {
    setEditing({ address: null });
    setLabel('');
    setAddressText('');
    setIsDefault(false);
    setFormError(null);
  }

  function openEdit(address: SavedDeliveryAddress) {
    setEditing({ address });
    setLabel(address.label);
    setAddressText(address.addressText);
    setIsDefault(address.isDefault);
    setFormError(null);
  }

  function closeForm() {
    setEditing(null);
  }

  function confirmDelete(address: SavedDeliveryAddress) {
    Alert.alert(
      'Delete address',
      `Delete "${address.label}"? Orders already placed keep their original address snapshot.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(address.id) },
      ],
    );
  }

  if (isLoading || !customerId) {
    return <LoadingSpinner />;
  }

  if (isError) {
    return <ErrorView message="Could not load your addresses." onRetry={refetch} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses ?? []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={styles.title}>Saved Addresses</Text>}
        renderItem={({ item }) => (
          <AddressCard
            address={item}
            onEdit={() => openEdit(item)}
            onDelete={() => confirmDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No saved addresses"
            message="Save your frequent delivery addresses for faster checkout."
            emoji="📍"
          />
        }
        ListFooterComponent={
          <Button title="+ Add New Address" onPress={openCreate} />
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={Boolean(editing)} animationType="slide" transparent onRequestClose={closeForm}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editing?.address ? 'Edit address' : 'New address'}
            </Text>
            <Input label="Label" value={label} onChangeText={setLabel} placeholder="Home" />
            <Input
              label="Full address"
              value={addressText}
              onChangeText={setAddressText}
              placeholder="Street, building, floor, landmark…"
              multiline
            />
            <Text
              style={[styles.defaultToggle, isDefault && styles.defaultToggleActive]}
              onPress={() => setIsDefault((v) => !v)}
            >
              {isDefault ? '✓ ' : ''}
              Set as default address
            </Text>
            {formError ? <Text style={styles.formError}>{formError}</Text> : null}
            <View style={styles.formButtons}>
              <Button title="Cancel" variant="outline" onPress={closeForm} />
              <Button
                title="Save"
                onPress={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
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
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  defaultToggle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  defaultToggleActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  formError: {
    ...typography.caption,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
