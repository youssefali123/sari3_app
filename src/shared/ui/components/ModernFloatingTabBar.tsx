import React, { useEffect, useMemo } from 'react';
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { useColors } from '@/shared/ui/theme';
import { Icon } from './Icon';
import { useAppSelector } from '@/shared/lib/store';
import { selectCartItemCount } from '@/features/cart/application/cartSlice';
import { useCurrentCustomerId } from '@/shared/lib/auth';
import { useQuery } from '@tanstack/react-query';
import { SupabaseOrderRepository } from '@/features/orders/infrastructure/SupabaseOrderRepository';
import { OrderStatus } from '@/features/orders/domain/entities/OrderStatus';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const orderRepository = new SupabaseOrderRepository();

const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
  OrderStatus.Expired,
];

interface TabConfig {
  icon: string;
  label: string;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  // Customer tabs
  '(home)': { icon: 'House', label: 'الرئيسية' },
  cart: { icon: 'ShoppingCart', label: 'السلة' },
  orders: { icon: 'ReceiptText', label: 'طلباتي' },
  favorites: { icon: 'Heart', label: 'المفضلة' },
  profile: { icon: 'User', label: 'حسابي' },

  // Driver tabs
  'available-orders': { icon: 'List', label: 'المتاحة' },
  'active-order': { icon: 'Bike', label: 'طلباتي' },
  history: { icon: 'ReceiptText', label: 'السجل' },
};

export interface ModernFloatingTabBarProps {
  state: any;
  descriptors: Record<string, any>;
  navigation: any;
  insets?: { top: number; bottom: number; left: number; right: number };
}

/**
 * Modern Floating Island Navigation Bar:
 * - Expanding Pill layout: Active tab expands smoothly with LinearTransition + FadeIn/FadeOut
 * - No scale jitter: Clean native geometry transitions without manual spring oscillations
 * - Theme-integrated: Harmonious Sari3 gold pill styling for light & dark modes
 * - Dynamic Cart Badge: Subtle pop on item counter changes
 * - Live Order Dot: Emerald indicator on orders tab during active fulfillment
 */
export function ModernFloatingTabBar({
  state,
  descriptors,
  navigation,
  insets: propInsets,
}: ModernFloatingTabBarProps) {
  const { isDark } = useTheme();
  const colors = useColors();
  const safeInsets = useSafeAreaInsets();
  const bottomInset = propInsets?.bottom ?? safeInsets.bottom;

  // Cart badge (Customer)
  const cartCount = useAppSelector(selectCartItemCount);

  // Customer live orders indicator
  const customerId = useCurrentCustomerId();
  const { data: customerOrders } = useQuery({
    queryKey: ['orders', customerId],
    queryFn: () => orderRepository.getCustomerOrders(customerId!),
    enabled: Boolean(customerId),
    staleTime: 1000 * 30, // 30s
  });

  const hasActiveCustomerOrder = useMemo(() => {
    if (!customerOrders || customerOrders.length === 0) return false;
    return customerOrders.some(
      (o) => !TERMINAL_STATUSES.includes(o.status as OrderStatus)
    );
  }, [customerOrders]);

  return (
    <View
      style={[
        styles.outerContainer,
        {
          paddingBottom: Math.max(bottomInset, 17),
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.dock,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            shadowOpacity: isDark ? 0.35 : 0.08,
          },
        ]}
      >
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];

          // Skip hidden routes (e.g. href: null)
          if (options.href === null) {
            return null;
          }

          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? {
            icon: 'Circle',
            label: options.title ?? route.name,
          };

          const onPress = (e: GestureResponderEvent) => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const isCart = route.name === 'cart';
          const isOrders = route.name === 'orders';
          const badgeCount = isCart && cartCount > 0 ? cartCount : undefined;
          const hasDot = isOrders && hasActiveCustomerOrder;

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              iconName={config.icon}
              label={config.label}
              badge={badgeCount}
              hasDot={hasDot}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
              isDark={isDark}
            />
          );
        })}
      </View>
    </View>
  );
}

// ── Tab Item Component ───────────────────────────────────────────────────────

interface TabItemProps {
  isFocused: boolean;
  iconName: string;
  label: string;
  badge?: number;
  hasDot?: boolean;
  onPress: (e: GestureResponderEvent) => void;
  onLongPress: () => void;
  accessibilityLabel: string;
  isDark: boolean;
}

const TabItem = React.memo(function TabItem({
  isFocused,
  iconName,
  label,
  badge,
  hasDot,
  onPress,
  onLongPress,
  accessibilityLabel,
  isDark,
}: TabItemProps) {
  const colors = useColors();
  const { theme } = useTheme();

  const activeBg = isDark ? 'rgba(255, 184, 0, 0.16)' : '#FFF8E1';
  const activeBorder = isDark ? 'rgba(255, 184, 0, 0.35)' : 'rgba(204, 148, 0, 0.28)';
  const activeColor = isDark ? '#FFD54F' : '#9E6E00';
  const inactiveColor = colors.mutedForeground;

  return (
    <AnimatedPressable
      layout={LinearTransition.springify().mass(0.5)}
      onPress={onPress}
      onLongPress={onLongPress}
      unstable_pressDelay={0}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={[
        styles.tabItem,
        isFocused
          ? [
              styles.tabItemActive,
              {
                backgroundColor: activeBg,
                borderColor: activeBorder,
              },
            ]
          : styles.tabItemInactive,
      ]}
    >
      {/* Icon with badges */}
      <View style={styles.iconWrap}>
        <Icon
          name={iconName}
          size={20}
          color={isFocused ? activeColor : inactiveColor}
          strokeWidth={isFocused ? 2.3 : 1.9}
          accessibilityHidden
        />
        {badge !== undefined && badge > 0 ? (
          <CartBadge count={badge} borderColor={isFocused ? activeBg : colors.card} />
        ) : null}
        {hasDot && !isFocused ? (
          <View style={[styles.liveDot, { borderColor: colors.card }]} />
        ) : null}
      </View>

      {/* Animated Label: Fades in/out while LinearTransition expands the pill */}
      {isFocused && (
        <Animated.Text
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={[
            styles.tabLabel,
            {
              color: activeColor,
              fontFamily: theme.typography.caption.fontFamily,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>
      )}
    </AnimatedPressable>
  );
});

// ── Cart Badge Component ─────────────────────────────────────────────────────

function CartBadge({ count, borderColor }: { count: number; borderColor: string }) {
  const colors = useColors();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (count > 0) {
      scale.value = withSequence(
        withTiming(1.2, { duration: 80 }),
        withSpring(1, { damping: 12, stiffness: 280 })
      );
    }
  }, [count, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: colors.primary,
          borderColor,
        },
        animatedStyle,
      ]}
    >
      <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
        {count > 99 ? '99+' : count}
      </Text>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    alignItems: 'center',
    paddingTop: 4,
  },
  dock: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    width: '92%',
    maxWidth: 420,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 10,
  },
  tabItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 21,
    gap: 6,
  },
  tabItemActive: {
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  tabItemInactive: {
    paddingHorizontal: 10,
    backgroundColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -9,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 11,
  },
  liveDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#27AE60',
    borderWidth: 1.2,
  },
});
