import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useDriverAvailability } from '@/features/drivers/application/hooks/useDriverAvailability';
import { useDriverAreas } from '@/features/drivers/application/hooks/useDriverAreas';
import { AvailabilityToggle } from '@/features/drivers/presentation/components/AvailabilityToggle';
import { useColors } from '@/shared/ui/hooks/useColors';
import {
  AppLogo,
  AppScreen,
  BrandHeader,
  PageScroll,
  PrimaryButton,
  ProfileRow,
  Surface,
} from '@/shared/ui/components';
import { Icon } from '@/shared/ui/components/Icon';

/**
 * Driver profile:
 * Upgraded to SOURCE design language with BrandHeader, Hero Banner,
 * Surface cards, and clean Arabic copy.
 */
export default function DriverProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { profile, signOut } = useAuth();
  const { isAvailable } = useDriverAvailability();
  const { areaNames, hasAssignedAreas, isLoading: areasLoading } = useDriverAreas();
  const workAreaLabel = hasAssignedAreas ? areaNames.join('، ') : 'لم يتم تعيين نطاقات توصيل بعد';

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
      <BrandHeader title="حسابي" subtitle="ملف كابتن التوصيل" />
      <PageScroll>
        {/* Driver Hero Banner */}
        <View style={[styles.profileHero, { backgroundColor: colors.primary }]}>
          <View style={styles.profileAvatar}>
            <Icon name="Bike" size={36} color={colors.foreground} />
          </View>
          <Text style={[styles.profileName, { color: colors.foreground }]}>
            {profile?.fullName || 'كابتن سريع'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: isAvailable ? colors.secondary : 'rgba(255,255,255,0.4)' }]}>
            <Text style={[styles.statusBadgeText, { color: isAvailable ? colors.secondaryForeground : colors.foreground }]}>
              {isAvailable ? 'متصل ومستعد للتوصيل' : 'غير متصل حالياً'}
            </Text>
          </View>
        </View>

        {/* Availability Section */}
        <Surface style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            حالة استقبال الطلبات
          </Text>
          <AvailabilityToggle />
        </Surface>

        {/* Work Areas Section */}
        <Surface style={styles.sectionCard}>
          <View style={styles.areaHeader}>
            <Icon name="MapPin" size={18} color={colors.secondaryForeground} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              نطاقات التوصيل المصرح بها
            </Text>
          </View>
          <Text style={[styles.areaText, { color: colors.mutedForeground }]}>
            {areasLoading ? 'جاري تحميل مناطق العمل…' : workAreaLabel}
          </Text>
        </Surface>

        {/* Switch to customer view */}
        <Surface style={[styles.switchCard, { backgroundColor: colors.muted }]}>
          <View style={styles.switchHeader}>
            <View style={[styles.switchIcon, { backgroundColor: colors.card }]}>
              <Icon name="User" size={20} color={colors.foreground} />
            </View>
            <View style={styles.switchCopy}>
              <Text style={[styles.switchTitle, { color: colors.foreground }]}>
                تصفح كعميل
              </Text>
              <Text style={[styles.switchSubtitle, { color: colors.mutedForeground }]}>
                الانتقال إلى واجهة متجر وتجربة طلب الوجبات
              </Text>
            </View>
          </View>
          <PrimaryButton
            title="الانتقال إلى وضع العميل"
            icon="basket"
            onPress={() => router.replace('/(customer)/(home)' as never)}
          />
        </Surface>

        {/* Sign Out Section */}
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
            سريع · تطبيق كباتن التوصيل · الإصدار 1.0.0
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 22,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  areaHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  areaText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  switchCard: {
    padding: 18,
    borderRadius: 22,
    gap: 14,
  },
  switchHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  switchIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchCopy: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  switchSubtitle: {
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
