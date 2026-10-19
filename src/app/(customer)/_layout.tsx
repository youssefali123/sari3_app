import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useTheme } from '@/shared/ui/context/ThemeContext';
import { AuthRequiredModal } from '@/shared/ui/components/AuthRequiredModal';
import { ModernFloatingTabBar } from '@/shared/ui/components/ModernFloatingTabBar';
import { OfflineNoticeBanner } from '@/shared/ui/components';

/**
 * Customer tab layout. Guests browse freely (001 Scenario 1); a signed-in
 * user whose server-side profile resolves to the driver role is bounced to
 * the driver app.
 *
 * Employs ModernFloatingTabBar: a floating dock navigation bar with
 * expanding active chips, dynamic cart badge, live order tracking dot,
 * and 0-delay tactile animations.
 */
export default function CustomerLayout() {
  const router = useRouter();
  const { user, profile, isLoading, isProfileLoading } = useAuth();
  const { theme } = useTheme();

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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <OfflineNoticeBanner />
      <Tabs
        backBehavior="history"
        tabBar={(props) => <ModernFloatingTabBar {...props} />}
        screenOptions={{
          animation: 'fade',
          sceneStyle: { backgroundColor: theme.colors.background },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: 'الرئيسية',
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="cart"
          options={{
            title: 'السلة',
            headerShown: false,
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
          }}
        />
        <Tabs.Screen
          name="favorites"
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
          }}
        />
        {/* Hidden legacy tab targets: actual navigation uses Root Stack for hardware-accelerated transitions */}
        <Tabs.Screen name="checkout/index" options={{ href: null, headerShown: false }} />
        <Tabs.Screen name="addresses/index" options={{ href: null, headerShown: false }} />
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
    </View>
  );
}
