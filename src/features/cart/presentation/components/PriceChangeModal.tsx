import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors, useTheme } from '@/shared/ui/theme';
import { PrimaryButton, Surface } from '@/shared/ui/components/AppUI';
import { SwipeableBottomSheetModal } from '@/shared/ui/components/SwipeableBottomSheetModal';
import { CartPriceDifference } from '../../domain/entities/CartRevalidation';
import { formatCurrency } from '@/shared/utils/formatting';

interface PriceChangeModalProps {
  visible: boolean;
  differences: CartPriceDifference[];
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Blocking sheet informing the customer about price adjustments before checkout (FR-007).
 * Displays line-by-line old vs new price with diff highlight.
 */
export function PriceChangeModal({
  visible,
  differences,
  onAccept,
  onReject,
}: PriceChangeModalProps) {
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <SwipeableBottomSheetModal
      visible={visible}
      onClose={onReject}
      title="تعديل في أسعار السلة"
      subtitle="تم تحديث أسعار بعض الأصناف في المتجر"
      showCloseButton={false}
    >
      <View style={styles.container}>
        <Text
          style={[
            styles.noticeText,
            {
              color: colors.mutedForeground,
              fontFamily: theme.typography.bodySmall.fontFamily,
            },
          ]}
        >
          طرأت تغييرات على أسعار بعض الأصناف المضافة في سلتك وفقاً للأسعار
          المعتمدة حديثاً لدى المتجر. يرجى مراجعة التغييرات للمتابعة:
        </Text>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {differences.map((item) => {
            const diff = item.newPrice - item.oldPrice;
            const isIncrease = diff > 0;
            return (
              <Surface
                key={item.productId}
                style={[styles.itemCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.itemHeader}>
                  <Text
                    style={[
                      styles.productName,
                      {
                        color: colors.foreground,
                        fontFamily: theme.typography.bodyMedium.fontFamily,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {item.productName}
                  </Text>
                  <View
                    style={[
                      styles.diffBadge,
                      {
                        backgroundColor: isIncrease
                          ? colors.errorSubtle
                          : '#D1FAE5',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.diffBadgeText,
                        {
                          color: isIncrease
                            ? colors.destructive
                            : '#065F46',
                          fontFamily: theme.typography.caption.fontFamily,
                        },
                      ]}
                    >
                      {isIncrease ? `+${formatCurrency(diff)}` : formatCurrency(diff)}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceRow}>
                  <Text
                    style={[
                      styles.oldPrice,
                      {
                        color: colors.mutedForeground,
                        fontFamily: theme.typography.caption.fontFamily,
                      },
                    ]}
                  >
                    السعر السابق: {formatCurrency(item.oldPrice)}
                  </Text>
                  <Text
                    style={[
                      styles.newPrice,
                      {
                        color: colors.foreground,
                        fontFamily: theme.typography.bodyMedium.fontFamily,
                      },
                    ]}
                  >
                    السعر الجديد: {formatCurrency(item.newPrice)}
                  </Text>
                </View>
              </Surface>
            );
          })}
        </ScrollView>

        <View style={styles.actionContainer}>
          <PrimaryButton
            title="الموافقة ومتابعة الطلب"
            onPress={onAccept}
          />
          <View style={styles.rejectButtonContainer}>
            <PrimaryButton
              title="العودة ومراجعة السلة"
              tone="outline"
              onPress={onReject}
            />
          </View>
        </View>
      </View>
    </SwipeableBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingBottom: 16,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'right',
    marginBottom: 16,
  },
  list: {
    maxHeight: 280,
  },
  listContent: {
    gap: 10,
    paddingBottom: 8,
  },
  itemCard: {
    padding: 12,
    borderRadius: 14,
  },
  itemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  diffBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  oldPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  newPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionContainer: {
    marginTop: 18,
    gap: 10,
  },
  rejectButtonContainer: {
    width: '100%',
  },
});
