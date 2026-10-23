import React, { useState } from 'react';
import {
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SavedDeliveryAddress } from '../domain/entities/SavedDeliveryAddress';
import { AddressException } from '../domain/entities/AddressError';
import { getAddressErrorMessage } from './messages/addressesErrorMessages.ar';
import { classifyAddressError } from '../infrastructure/addressErrorClassifier';
import { AddressCard } from './AddressCard';
import { Input } from '@/shared/ui/components/Input';
import { SkeletonCard } from '@/shared/ui/motion';
import { EmptyState, PrimaryButton } from '@/shared/ui/components/AppUI';
import { Icon } from '@/shared/ui/components/Icon';
import { SwipeableBottomSheetModal } from '@/shared/ui/components/SwipeableBottomSheetModal';
import { useColors } from '@/shared/ui/theme';

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
 * new one inline — smoothly elevates above the keyboard when typing.
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
  const colors = useColors();

  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [addressText, setAddressText] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleAddNew() {
    Keyboard.dismiss();
    if (!label.trim()) {
      setFormError('يرجى إدخال تسمية للعنوان (مثال: المنزل).');
      return;
    }
    if (!addressText.trim()) {
      setFormError('يرجى كتابة العنوان بالتفصيل.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await onAddNew({ label: label.trim(), addressText: addressText.trim() });
      setLabel('');
      setAddressText('');
      setShowForm(false);
      onClose();
    } catch (error) {
      if (__DEV__) console.error('[AddressSelectionModalError]', error);
      const addrError = error instanceof AddressException ? error : classifyAddressError(error);
      setFormError(getAddressErrorMessage(addrError.kind));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SwipeableBottomSheetModal
      visible={visible}
      onClose={onClose}
      enableContentPan={false}
      title={showForm ? 'إضافة عنوان توصيل' : 'اختر عنوان التوصيل'}
      headerRight={
        showForm ? (
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setShowForm(false);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            style={styles.closeBtn}
          >
            <Icon name="ArrowRight" size={20} color={colors.mutedForeground} />
          </Pressable>
        ) : undefined
      }
    >

          {showForm ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.formContainer}
            >
              <Input
                label="تسمية العنوان"
                value={label}
                onChangeText={setLabel}
                placeholder="مثال: المنزل، العمل، الشقة..."
                testID="checkout-address-label-input"
              />
              <Input
                label="العنوان بالتفصيل"
                value={addressText}
                onChangeText={setAddressText}
                placeholder="الشارع، رقم البناية، رقم الطابق، علامة مميزة..."
                multiline
                numberOfLines={3}
                style={styles.multilineInput}
                testID="checkout-address-text-input"
              />
              {formError ? (
                <Text style={[styles.formError, { color: colors.destructive }]}>{formError}</Text>
              ) : null}
              <View style={styles.formActions}>
                <PrimaryButton
                  title="حفظ واختيار العنوان"
                  icon="checkmark-circle-outline"
                  onPress={handleAddNew}
                  loading={saving}
                  testID="save-new-address-checkout"
                />
              </View>
            </ScrollView>
          ) : isLoading ? (
            <View style={styles.skeletonWrap}>
              {[0, 1].map((idx) => (
                <SkeletonCard key={idx} style={styles.skeletonItem} />
              ))}
            </View>
          ) : !addresses || addresses.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                title="لا توجد عناوين محفوظة"
                message="أضف عنوان توصيل لإكمال الطلب."
                icon="location-outline"
              />
              <View style={styles.addFirstBtn}>
                <PrimaryButton
                  title="إضافة عنوان جديد"
                  icon="add-circle"
                  onPress={() => setShowForm(true)}
                />
              </View>
            </View>
          ) : (
            <FlatList
              data={addresses}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
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

          {!showForm && addresses && addresses.length > 0 ? (
            <View style={styles.footer}>
              <PrimaryButton
                title="+ إضافة عنوان جديد"
                tone="outline"
                onPress={() => setShowForm(true)}
              />
            </View>
          ) : null}
    </SwipeableBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  formContainer: {
    gap: 14,
    paddingBottom: 12,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formError: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4,
  },
  formActions: {
    marginTop: 8,
  },
  skeletonWrap: {
    gap: 12,
    paddingVertical: 12,
  },
  skeletonItem: {
    height: 96,
    borderRadius: 20,
  },
  emptyWrap: {
    paddingVertical: 20,
  },
  addFirstBtn: {
    marginTop: 16,
  },
  listContent: {
    paddingVertical: 8,
    gap: 10,
  },
  footer: {
    marginTop: 14,
  },
});
