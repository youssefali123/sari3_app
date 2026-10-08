import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { ProfileErrorView } from '@/features/auth/presentation/components/ProfileErrorView';
import { OfflineNoticeBanner } from '@/features/drivers/presentation/components/OfflineNoticeBanner';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { Icon } from '@/shared/ui/components/Icon';
import { TabBarButton } from '@/shared/ui/components/TabBarButton';

/**
 * Driver tab navigator — authenticated drivers only. The role check reads the
 * server-authoritative profile.role from AuthContext, never client metadata.
 * Malformed/missing profiles get an explicit recoverable error state instead
 * of a silent misroute (US7).
 */
export default function DriverLayout() {
  const { user, profile, isLoading, isProfileLoading, authError } = useAuth();
  const insets = useSafeAreaInsets();

  if (isLoading || (user && isProfileLoading)) {
    // Session and profile are still resolving — redirecting here would read
    // a null role and misroute a driver into the customer app.
    return <View style={{ flex: 1 }} />;
  }

  if (!user) {
    // No returnTo for driver routes: drivers always go through login directly.
    return <Redirect href="/(auth)/login" />;
  }

  if (authError === 'profile_not_found') {
    return <ProfileErrorView />;
  }

  if (profile?.role !== 'driver') {
    return <Redirect href="/(customer)/(home)" />;
  }

  const { theme } = useTheme();
  const styles = createStyles(theme);
  const activeIconColor = theme.colors.primaryForeground;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <OfflineNoticeBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarActiveTintColor: theme.colors.textPrimary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
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
          name="available-orders"
          options={{
            title: 'الطلبات المتاحة',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="List" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
        <Tabs.Screen
          name="active-order"
          options={{
            title: 'طلباتي النشطة',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="Bike" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'سجل التوصيل',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="ReceiptText" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'حسابي',
            tabBarIcon: ({ focused, color }) => (
              <TabIcon focused={focused} color={color} name="User" styles={styles} activeColor={activeIconColor} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

interface TabIconProps {
  focused: boolean;
  color: any;
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
      minWidth: 44,
      height: 30,
      borderRadius: theme.radii.large,
    },
    iconSlotActive: {
      backgroundColor: theme.colors.primary,
    },
  });
