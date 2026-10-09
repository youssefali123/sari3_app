import React from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RegisterForm } from '@/features/auth/presentation/components/RegisterForm';
import { AppScreen, BrandHeader } from '@/shared/ui/components/AppUI';
import { Icon } from '@/shared/ui/components/Icon';
import { useColors, useTheme } from '@/shared/ui/theme';
import { useSmoothKeyboardElevation } from '@/shared/ui/motion';

/**
 * Brand-aligned Register screen for Sari3:
 * - Unified BrandHeader at the very top with RTL back button and quick guest skip
 * - Brand hero section with gold bike emblem & Tajawal typography
 * - Smooth Reanimated keyboard elevation when typing in inputs
 * - Instant segmented switch between Sign In and Register
 * - Themed card container with shadow and RTL alignment
 * - Single-tap submit resilience with keyboardShouldPersistTaps="always"
 */
export default function RegisterScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const router = useRouter();
  const colors = useColors();
  const { theme } = useTheme();
  const animatedKeyboardStyle = useSmoothKeyboardElevation({
    maxOffset: 180,
    factor: 0.7,
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/(home)');
    }
  };

  return (
    <AppScreen>
      {/* Unified BrandHeader matching app-wide design identity */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
        <BrandHeader
          title="إنشاء حساب جديد"
          subtitle="انضم إلى عائلة سريع"
          onBack={handleBack}
          trailing={
            <Pressable
              onPress={() => router.replace('/(customer)/(home)')}
              hitSlop={8}
              style={[
                styles.guestPill,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="تخطي كزائر"
            >
              <Text
                style={[
                  styles.guestPillText,
                  {
                    color: colors.mutedForeground,
                    fontFamily: theme.typography.caption.fontFamily,
                  },
                ]}
                numberOfLines={1}
              >
                تخطي كزائر
              </Text>
              <Icon name="Compass" size={15} color={colors.mutedForeground} />
            </Pressable>
          }
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={Keyboard.dismiss} accessible={false}>
          <Animated.View style={animatedKeyboardStyle}>
            {/* Brand Banner */}
        <View style={styles.brandHero}>
          <View
            style={[
              styles.logoHalo,
              {
                backgroundColor: colors.primarySubtle,
                borderColor: 'rgba(245, 189, 22, 0.45)',
              },
            ]}
          >
            <View style={[styles.logoCore, { backgroundColor: colors.primary }]}>
              <Icon name="Bike" size={26} color={colors.primaryForeground} />
            </View>
          </View>

          <View style={styles.brandTitleRow}>
            <Text
              style={[
                styles.brandTitle,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.headingLarge.fontFamily,
                },
              ]}
            >
              سـريـع
            </Text>
            <View style={[styles.brandDot, { backgroundColor: colors.primary }]} />
          </View>

          <Text
            style={[
              styles.brandSubtitle,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.bodyMedium.fontFamily,
              },
            ]}
          >
            أنشئ حسابك الآن واستمتع بأسرع تجربة توصيل
          </Text>
        </View>

        {/* Tab Switcher (دخول / إنشاء حساب) */}
        <View
          style={[
            styles.tabSwitcher,
            {
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            style={styles.inactiveTab}
            onPress={() =>
              router.replace({
                pathname: '/(auth)/login',
                params: { returnTo },
              })
            }
          >
            <Text
              style={[
                styles.inactiveTabText,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.button.fontFamily,
                },
              ]}
            >
              تسجيل الدخول
            </Text>
          </Pressable>

          <View
            style={[
              styles.activeTab,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.activeTabText,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.button.fontFamily,
                },
              ]}
            >
              إنشاء حساب
            </Text>
          </View>
        </View>

        {/* Form Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <RegisterForm returnTo={returnTo ?? ''} />
        </View>
      </Animated.View>
    </Pressable>
  </ScrollView>
  </AppScreen>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    zIndex: 10,
    elevation: 4,
  },
  guestPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    flexShrink: 0,
    minHeight: 36,
  },
  guestPillText: {
    fontSize: 13,
    fontWeight: '600',
    includeFontPadding: false,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  logoCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  tabSwitcher: {
    flexDirection: 'row-reverse',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inactiveTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
});
