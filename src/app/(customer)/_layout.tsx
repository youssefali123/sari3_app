import React from 'react';
import { ColorValue, StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';

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
  const { user, profile, isLoading, isProfileLoading } = useAuth();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const activeIconColor = theme.colors.secondary;

  // Wait for the profile before trusting a null role.
  if (isLoading || (user && isProfileLoading)) {
    return null;
  }

  if (user && profile?.role === 'driver') {
    return <Redirect href="/(driver)/available-orders" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          ...theme.typography.caption,
          fontWeight: '500',
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
  return (
    <View style={[styles.iconSlot, focused && styles.iconSlotActive]}>
      <Icon
        name={name}
        size={20}
        color={focused ? activeColor : (color as string)}
        accessibilityHidden
      />
    </View>
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
