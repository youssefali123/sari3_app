import React, { useEffect, useState } from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';
import { TabBarButton } from '@/shared/ui/components/TabBarButton';
import { AuthRequiredModal } from '@/shared/ui/components/AuthRequiredModal';

/**
 * Customer tab layout. Guests browse freely (001 Scenario 1); a signed-in
 * user whose server-side profile resolves to the driver role is bounced to
 * the driver app — this also recovers a driver who landed here while their
 * profile fetch was still in flight.
 *
 * Tab bar styled per the Phase 3 home design (screens/home.jpeg): white
 * surface, top hairline, Tajawal labels, active tab highlighted by a
 * primary pill behind the icon.
 */
export default function CustomerLayout() {
  const router = useRouter();
  const { user, profile, isLoading, isProfileLoading } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);
  const activeIconColor = theme.colors.primaryForeground;

  const [authModal, setAuthModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: string;
    returnTo: string;
  }>({
    visible: false,
    title: 'التسجيل مطلوب',
    message: '',
    icon: 'Lock',
    returnTo: '',
  });

  const promptLogin = (title: string, message: string, icon: string, returnTo: string) => {
    setAuthModal({
      visible: true,
      title,
      message,
      icon,
      returnTo,
    });
  };

  // Wait for the profile before trusting a null role.
  if (isLoading || (user && isProfileLoading)) {
    return null;
  }

  if (user && profile?.role === 'driver') {
    return <Redirect href="/(driver)/available-orders" />;
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarActiveTintColor: theme.colors.textPrimary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.divider,
            borderTopWidth: 1,
            height: 60 + Math.max(insets.bottom, 8),
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 6,
          },
          tabBarLabelStyle: {
            ...theme.typography.caption,
            fontWeight: '600',
            fontSize: 11,
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: 'الرئيسية',
            headerShown: false,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="House" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'السلة',
            headerShown: false,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="ShoppingCart" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          listeners={{
            tabPress: (e) => {
              if (!user) {
                e.preventDefault();
                promptLogin(
                  'التسجيل مطلوب',
                  'سجّل دخولك لمتابعة حالة طلباتك الحالية واستعراض طلباتك السابقة بسهولة.',
                  'ReceiptText',
                  '/(customer)/orders',
                );
              }
            },
          }}
          options={{
            title: 'طلباتي',
            headerShown: false,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="ReceiptText" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites/index"
          listeners={{
            tabPress: (e) => {
              if (!user) {
                e.preventDefault();
                promptLogin(
                  'التسجيل مطلوب',
                  'سجّل دخولك للوصول إلى قائمتك المفضلة وحفظ المطاعم والأطباق التي تحبها.',
                  'Heart',
                  '/(customer)/favorites',
                );
              }
            },
          }}
          options={{
            title: 'المفضلة',
            headerShown: false,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="Heart" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          listeners={{
            tabPress: (e) => {
              if (!user) {
                e.preventDefault();
                promptLogin(
                  'التسجيل مطلوب',
                  'سجّل دخولك لإدارة حسابك وعناوين التوصيل ومعلوماتك الشخصية.',
                  'User',
                  '/(customer)/profile',
                );
              }
            },
          }}
          options={{
            title: 'حسابي',
            headerShown: false,
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="User" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
        {/* Non-tab routes: expo-router auto-registers undeclared children as
            tabs — hide them explicitly (they push as stack screens). */}
        <Tabs.Screen name="checkout/index" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="addresses/index" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="favorites/stores" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="favorites/products" options={{ href: null, headerShown: false }} />
      </Tabs>

      <AuthRequiredModal
        visible={authModal.visible}
        title={authModal.title}
        message={authModal.message}
        icon={authModal.icon}
        confirmLabel="تسجيل الدخول"
        cancelLabel="تصفح كزائر"
        onConfirm={() => {
          const returnTo = authModal.returnTo;
          setAuthModal((prev) => ({ ...prev, visible: false }));
          router.push({
            pathname: '/(auth)/login',
            params: { returnTo },
          });
        }}
        onCancel={() => {
          setAuthModal((prev) => ({ ...prev, visible: false }));
        }}
      />
    </>
  );
}

interface TabIconProps {
  focused: boolean;
  color: ColorValue;
  name: string;
  styles: ReturnType<typeof createStyles>;
  activeColor: string;
}

function TabIcon({ focused, color, name, styles, activeColor }: TabIconProps) {
  const scale = useSharedValue(focused ? 1 : 0.94);

  useEffect(() => {
    if (focused) {
      scale.value = withSequence(
        withTiming(1.14, { duration: 90 }),
        withSpring(1, { damping: 12, stiffness: 320 })
      );
    } else {
      scale.value = withTiming(0.96, { duration: 100 });
    }
  }, [focused, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.iconSlot, focused && styles.iconSlotActive, animatedStyle]}>
      <Icon
        name={name}
        size={20}
        color={focused ? activeColor : (color as string)}
        accessibilityHidden
      />
    </Animated.View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    iconSlot: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 48,
      height: 30,
      borderRadius: theme.radii.large,
    },
    iconSlotActive: {
      backgroundColor: theme.colors.primary,
    },
  });
