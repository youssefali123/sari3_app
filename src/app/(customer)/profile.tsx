import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useRequireAuth } from '@/features/auth/presentation/hooks/useRequireAuth';
import { useColors } from '@/shared/ui/hooks/useColors';
import {
  AppLogo,
  AppScreen,
  AuthRequiredView,
  BrandHeader,
  PageScroll,
  PrimaryButton,
  ProfileRow,
  Surface,
} from '@/shared/ui/components';
import { Icon } from '@/shared/ui/components/Icon';

export default function CustomerProfileScreen() {
  const router = useRouter();
  // Protected screen: guests are redirected to login with returnTo (FR-003).
  useRequireAuth('/(customer)/profile');
  const { user, profile, signOut, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();

  if (!isAuthLoading && !user) {
    return (
      <AppScreen>
        <BrandHeader title="حسابي" subtitle="إدارة ملفك الشخصي" />
        <AuthRequiredView
          icon="User"
          title="التسجيل مطلوب"
          message="سجّل دخولك لإدارة حسابك وعناوين التوصيل والاطلاع على تفاصيلك."
          returnTo="/(customer)/profile"
        />
      </AppScreen>
    );
  }

  const isDriver = profile?.role === 'driver';

  async function handleSignOut() {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تسجيل الخروج',
          style: 'destructive',
          onPress: async () => {
            try {
              // Centralized signOut: also purges the TanStack Query cache.
              await signOut();
              router.replace('/(customer)/(home)');
            } catch (error) {
              Alert.alert(
                'فشل تسجيل الخروج',
                error instanceof Error ? error.message : 'يرجى المحاولة مرة أخرى.',
              );
            }
          },
        },
      ],
    );
  }

  return (
    <AppScreen>
      <BrandHeader title="حسابي" subtitle="إدارة ملفك الشخصي" />
      <PageScroll>
        {/* Profile Hero Banner */}
        <View style={[styles.profileHero, { backgroundColor: colors.primary }]}>
          <View style={styles.profileAvatar}>
            <Icon
              name={isDriver ? 'Bike' : 'User'}
              size={34}
              color={colors.foreground}
            />
          </View>
          <Text style={[styles.profileName, { color: colors.foreground }]}>
            {profile?.fullName || 'أهلاً بك'}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={[styles.roleText, { color: colors.foreground }]}>
              {isDriver ? 'كابتن توصيل سريع' : 'عميل معتمد'}
            </Text>
          </View>
        </View>

        {/* Profile Navigation Links */}
        <Surface style={styles.profileCard}>
          <ProfileRow
            icon="location-outline"
            title="عناويني المسجلة"
            detail="إدارة عناوين التوصيل"
            onPress={() => router.push('/(customer)/addresses' as never)}
          />
          <ProfileRow
            icon="heart"
            title="المفضلة"
            detail="المتاجر والمنتجات المفضلة"
            onPress={() => router.push('/(customer)/favorites' as never)}
          />
          <ProfileRow
            icon="restaurant-outline"
            title="المتاجر المفضلة"
            detail="قائمة المتاجر المحفوظة"
            onPress={() => router.push('/(customer)/favorites/stores' as never)}
          />
          <ProfileRow
            icon="bag"
            title="المنتجات المفضلة"
            detail="المنتجات المحفوظة للطلب السريع"
            onPress={() => router.push('/(customer)/favorites/products' as never)}
          />
          <ProfileRow
            icon="receipt-outline"
            title="طلباتي السابقة"
            detail="متابعة وسجل الطلبات"
            onPress={() => router.push('/(customer)/orders' as never)}
          />
          <ProfileRow
            icon="help-circle-outline"
            title="الدعم والمساعدة"
            detail="فريق خدمة العملاء جاهز لخدمتك"
            onPress={() =>
              Alert.alert('الدعم والمساعدة', 'فريق خدمة عملاء سريع متاح دائماً لدعمكم عبر واتساب والهاتف.')
            }
          />
        </Surface>

        {/* Driver switch card if driver account */}
        {isDriver && (
          <Surface style={[styles.driverCard, { backgroundColor: colors.secondary }]}>
            <View style={styles.driverCardHeader}>
              <View style={[styles.driverCardIcon, { backgroundColor: colors.primary }]}>
                <Icon name="Bike" size={20} color={colors.foreground} />
              </View>
              <View style={styles.driverCardCopy}>
                <Text style={[styles.driverCardTitle, { color: colors.secondaryForeground }]}>
                  لوحة تحكم الكابتن
                </Text>
                <Text style={[styles.driverCardSubtitle, { color: colors.secondaryForeground + 'B3' }]}>
                  استقبل الطلبات وابدأ رحلات التوصيل
                </Text>
              </View>
            </View>
            <PrimaryButton
              title="الانتقال إلى وضع الكابتن"
              icon="bicycle"
              onPress={() => router.replace('/(driver)' as never)}
            />
          </Surface>
        )}

        {/* Sign out section */}
        <Surface style={styles.signOutCard}>
          <ProfileRow
            icon="trash-outline"
            title="تسجيل الخروج"
            detail="الخروج من الحساب بأمان"
            isDestructive
            showChevron={false}
            onPress={() => void handleSignOut()}
          />
        </Surface>

        <View style={styles.brandFooter}>
          <AppLogo size={52} withShadow style={styles.footerLogo} />
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
            سريع · تطبيق التوصيل الأسرع في مدينتك · الإصدار 1.0.0
          </Text>
        </View>
      </PageScroll>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileHero: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 8,
    borderRadius: 24,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  profileCard: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 22,
  },
  driverCard: {
    gap: 14,
    padding: 18,
    borderRadius: 22,
  },
  driverCardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  driverCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverCardCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  driverCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  driverCardSubtitle: {
    fontSize: 12,
    textAlign: 'right',
  },
  signOutCard: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 22,
  },
  brandFooter: {
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  footerLogo: {
    marginBottom: 2,
  },
  versionText: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginTop: 2,
  },
});
