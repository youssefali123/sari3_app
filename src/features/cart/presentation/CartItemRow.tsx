import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { CartItem } from '../domain/entities/CartItem';
import { calculateItemTotal } from '../domain/cartUtils';
import { cardPress, usePressAnimation, useQuantityTick } from '@/shared/ui/motion';
import { useColors } from '@/shared/ui/theme';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';
import { formatCurrencyCompact } from '@/shared/utils/formatting';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
}

/**
 * Cart line item matching SOURCE CartScreen layout:
 * RTL Surface card with 74x74 image, title and trash button on top,
 * add-ons list, and bottom row with line total and circular quantity stepper.
 */
export function CartItemRow({ item, onUpdateQuantity, onRemove }: CartItemRowProps) {
  const colors = useColors();
  const { theme } = useTheme();
  const { onPressIn, onPressOut, animatedStyle } = usePressAnimation(cardPress);
  const { tickStyle } = useQuantityTick(item.quantity);

  const atMin = item.quantity <= 1;

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        {item.productImageUrl ? (
          <Image source={{ uri: item.productImageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.image,
              styles.imagePlaceholder,
              { backgroundColor: colors.muted },
            ]}
          >
            <Icon name="Utensils" size={24} color={colors.mutedForeground} />
          </View>
        )}

        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.name,
                { color: colors.foreground, fontFamily: theme.typography.headingSmall.fontFamily },
              ]}
              numberOfLines={1}
            >
              {item.productName}
            </Text>

            <Pressable
              onPress={() => onRemove(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`احذف ${item.productName}`}
              hitSlop={8}
              style={({ pressed }) => [
                styles.removeButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              testID={`remove-${item.id}`}
            >
              <Icon name="Trash2" size={19} color={colors.destructive} />
            </Pressable>
          </View>

          {item.variantName ? (
            <View style={[styles.variantBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.variantText, { color: colors.secondaryForeground }]}>
                {item.variantName}
              </Text>
            </View>
          ) : null}

          {item.selectedAddOns.length > 0 ? (
            <Text
              style={[
                styles.addOns,
                { color: colors.mutedForeground, fontFamily: theme.typography.caption.fontFamily },
              ]}
              numberOfLines={2}
            >
              {item.selectedAddOns.map((a) => a.name).join('، ')}
            </Text>
          ) : null}

          <View style={styles.bottomRow}>
            <Text
              style={[
                styles.price,
                { color: colors.foreground, fontFamily: theme.typography.price.fontFamily },
              ]}
            >
              {formatCurrencyCompact(calculateItemTotal(item))}
            </Text>

            <View style={styles.quantityControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تقليل الكمية"
                onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
                disabled={atMin}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.stepperButton,
                  { opacity: atMin ? 0.35 : pressed ? 0.6 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] },
                ]}
              >
                <Icon name="MinusCircle" size={24} color={colors.foreground} />
              </Pressable>

              <Animated.View style={tickStyle}>
                <Text
                  style={[
                    styles.quantityText,
                    { color: colors.foreground, fontFamily: theme.typography.numeric.fontFamily },
                  ]}
                >
                  {item.quantity}
                </Text>
              </Animated.View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="زيادة الكمية"
                onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.stepperButton,
                  { opacity: pressed ? 0.6 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] },
                ]}
              >
                <Icon name="PlusCircle" size={24} color={colors.secondaryForeground} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 11,
  },
  card: {
    minHeight: 96,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 11,
  },
  image: {
    width: 74,
    height: 74,
    borderRadius: 16,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  removeButton: {
    padding: 2,
  },
  variantBadge: {
    alignSelf: 'flex-end',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  variantText: {
    fontSize: 10,
    fontWeight: '700',
  },
  addOns: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'right',
  },
  bottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  quantityControls: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 18,
    textAlign: 'center',
  },
});
