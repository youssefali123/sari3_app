import React, { useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SavedDeliveryAddress } from '@/features/addresses/domain/entities/SavedDeliveryAddress';
import { AddressRepository } from '@/features/addresses/domain/repositories/AddressRepository';
import { SupabaseAddressRepository } from '@/features/addresses/infrastructure/SupabaseAddressRepository';
import { AddressCard } from '@/features/addresses/presentation/AddressCard';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import Animated from 'react-native-reanimated';
import { Input } from '@/shared/ui/components/Input';
import { SkeletonCard, useSmoothKeyboardElevation } from '@/shared/ui/motion';
import { ErrorView } from '@/shared/ui/components/ErrorView';
import { ConfirmDialog } from '@/shared/ui/components/ConfirmDialog';
import { AuthRequiredView } from '@/shared/ui/components/AuthRequiredModal';
import { Icon } from '@/shared/ui/components/Icon';
import {
  AppScreen,
  BrandHeader,
  EmptyState,
  PrimaryButton,
} from '@/shared/ui/components/AppUI';
import { useColors, useTheme } from '@/shared/ui/theme';

const addressRepository: AddressRepository = new SupabaseAddressRepository();

interface EditingState {
  address: SavedDeliveryAddress | null; // null = creating a new address
}

/**
 * Saved addresses screen tailored to Sari3 brand identity:
 * - AppScreen & BrandHeader with RTL title and dynamic address count
 * - Pulse Skeletons during loading
 * - Card list matching e-commerce standards with custom semantic icons
 * - Cross-platform ConfirmDialog for deletion
 * - Elegant bottom-sheet modal for adding/editing addresses
 */
export default function SavedAddressesScreen() {
  useRequireAuth('/(customer)/addresses');
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const customerId = useCurrentCustomerId();
  const queryClient = useQueryClient();
  const colors = useColors();
  const { theme } = useTheme();
  const animatedKeyboardStyle = useSmoothKeyboardElevation();

  const [editing, setEditing] = useState<EditingState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedDeliveryAddress | null>(null);
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
      if (!customerId) throw new Error('يرجى تسجيل الدخول أولاً');
      if (!label.trim()) {
        throw new Error('يرجى كتابة تسمية للعنوان (مثال: المنزل).');
      }
      if (!addressText.trim()) {
        throw new Error('يرجى كتابة تفاصيل العنوان كاملاً.');
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
    setFormError(null);
  }

  const countSubtitle =
    addresses && addresses.length > 0
      ? `${addresses.length} ${addresses.length === 1 ? 'عنوان مسجل' : 'عناوين مسجلة'}`
      : 'إدارة مواقع التوصيل';

  if (!isAuthLoading && !user) {
    return (
      <AppScreen>
        <BrandHeader title="عناويني المحفوظة" subtitle="إدارة مواقع التوصيل" onBack={() => router.back()} />
        <AuthRequiredView
          icon="MapPin"
          title="التسجيل مطلوب"
          message="سجّل دخولك لإضافة وحفظ عناوين التوصيل لتسهيل وتسريع طلباتك."
          returnTo="/(customer)/addresses"
        />
      </AppScreen>
    );
  }

  if (isLoading) {
    return (
      <AppScreen>
        <BrandHeader title="عناويني المحفوظة" subtitle="جاري التحميل..." onBack={() => router.back()} />
        <View style={styles.listContent}>
          {[0, 1, 2].map((idx) => (
            <SkeletonCard key={idx} style={styles.skeletonCard} />
          ))}
        </View>
      </AppScreen>
    );
  }

  if (isError) {
    return (
      <AppScreen>
        <BrandHeader title="عناويني المحفوظة" onBack={() => router.back()} />
        <ErrorView message="تعذر تحميل العناوين المحفوظة. يرجى المحاولة لاحقاً." onRetry={refetch} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <BrandHeader
        title="عناويني المحفوظة"
        subtitle={countSubtitle}
        onBack={() => router.back()}
      />

      <FlatList
        data={addresses ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AddressCard
            address={item}
            onEdit={() => openEdit(item)}
            onDelete={() => setDeleteTarget(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              title="لا توجد عناوين مسجلة"
              message="أضف عناوينك المتكررة (مثل المنزل أو العمل) لتسريع وتسهيل طلباتك."
              icon="location-outline"
            />
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Bottom Add Button */}
      <View style={[styles.bottomBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <PrimaryButton
          title="إضافة عنوان جديد"
          icon="add-circle"
          onPress={openCreate}
          testID="add-new-address"
        />
      </View>

      {/* Add / Edit Address Sheet Modal */}
      <Modal
        visible={Boolean(editing)}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={closeForm}
      >
        <View style={styles.backdrop}>
          {/* Tapping backdrop dismisses keyboard and closes modal */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              closeForm();
            }}
          />

          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: colors.card },
              animatedKeyboardStyle,
            ]}
          >
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  closeForm();
                }}
                hitSlop={8}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
              >
                <Icon name="X" size={20} color={colors.mutedForeground} />
              </Pressable>
              <Text
                style={[
                  styles.sheetTitle,
                  {
                    color: colors.foreground,
                    fontFamily: theme.typography.headingSmall.fontFamily,
                  },
                ]}
              >
                {editing?.address ? 'تعديل العنوان' : 'إضافة عنوان جديد'}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.formContent}
            >
              <Input
                label="تسمية العنوان"
                value={label}
                onChangeText={setLabel}
                placeholder="مثال: المنزل، المكتب، الشقة..."
                testID="address-label-input"
              />

              <Input
                label="العنوان بالتفصيل"
                value={addressText}
                onChangeText={setAddressText}
                placeholder="الشارع، رقم البناية، رقم الطابق أو الشقة، علامة مميزة..."
                multiline
                numberOfLines={3}
                style={styles.multilineInput}
                testID="address-text-input"
              />

              {/* Set as Default Toggle */}
              <Pressable
                style={[
                  styles.defaultToggleRow,
                  {
                    backgroundColor: isDefault ? colors.primarySubtle : colors.secondary,
                    borderColor: isDefault ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setIsDefault((prev) => !prev)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDefault }}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isDefault ? colors.primary : colors.border,
                      backgroundColor: isDefault ? colors.primary : colors.surface,
                    },
                  ]}
                >
                  {isDefault ? <Icon name="Check" size={14} color={colors.primaryForeground} /> : null}
                </View>
                <Text
                  style={[
                    styles.defaultToggleText,
                    {
                      color: isDefault ? colors.foreground : colors.mutedForeground,
                      fontFamily: theme.typography.caption.fontFamily,
                      fontWeight: isDefault ? '700' : '500',
                    },
                  ]}
                >
                  تعيين هذا العنوان كعنوان توصيل افتراضي
                </Text>
              </Pressable>

              {formError ? (
                <Text style={[styles.formError, { color: colors.destructive }]}>
                  {formError}
                </Text>
              ) : null}

              {/* Save / Cancel CTAs */}
              <View style={styles.formActions}>
                <PrimaryButton
                  title={editing?.address ? 'حفظ التعديلات' : 'حفظ العنوان'}
                  icon="checkmark-circle-outline"
                  onPress={() => {
                    Keyboard.dismiss();
                    saveMutation.mutate();
                  }}
                  loading={saveMutation.isPending}
                  testID="save-address-btn"
                />
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteTarget !== null}
        title="حذف هذا العنوان؟"
        message={`هل أنت متأكد من حذف عنوان "${deleteTarget?.label}"؟ الطلبات السابقة ستحتفظ ببياناتها.`}
        confirmLabel="حذف العنوان"
        cancelLabel="إلغاء"
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 100,
    gap: 12,
  },
  skeletonCard: {
    height: 100,
    borderRadius: 20,
  },
  emptyWrap: {
    paddingTop: 48,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
  },
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
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  formContent: {
    gap: 14,
    paddingBottom: 12,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  defaultToggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultToggleText: {
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  formError: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4,
  },
  formActions: {
    marginTop: 8,
  },
});
