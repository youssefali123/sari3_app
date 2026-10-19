import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAppRouter } from '@/shared/ui/hooks/useAppRouter';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useDriverAvailability } from '@/features/drivers/application/hooks/useDriverAvailability';
import { useDriverAreas } from '@/features/drivers/application/hooks/useDriverAreas';
import { useDriverHistory } from '@/features/drivers/application/hooks/useDriverHistory';
import { AvailabilityToggle } from '@/features/drivers/presentation/components/AvailabilityToggle';
import { useColors, useTheme } from '@/shared/ui/theme';
import {
  AppLogo,
  AppScreen,
  BrandHeader,
  PageScroll,
  ProfileRow,
  Surface,
} from '@/shared/ui/components';
import { Icon } from '@/shared/ui/components/Icon';

/**
 * Driver profile:
 * Upgraded to Sari3 design language with Hero Banner, Stats Grid,
 * Surface cards, Tajawal typography, and clean Arabic copy.
 */
export default function DriverProfileScreen() {
  const router = useAppRouter();
  const colors = useColors();
  const { theme } = useTheme();
  const { profile, signOut } = useAuth();
  const { isAvailable } = useDriverAvailability();
  const { areaNames, hasAssignedAreas, isLoading: areasLoading, refetch: refetchAreas } = useDriverAreas();
  const { data: historyData, refetch: refetchHistory, isRefetching: historyRefetching } = useDriverHistory();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchAreas?.(), refetchHistory?.()]);
    } finally {
      setRefreshing(false);
    }
  };

  const completedDeliveries = (historyData ?? []).filter(
    (e) => e.finalStatus === 'completed',
  ).length;

  const workAreaLabel = hasAssignedAreas
    ? areaNames.join('، ')
    : 'لم يتم تعيين نطاقات توصيل بعد';

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
      <PageScroll
        refreshing={refreshing || historyRefetching}
        onRefresh={() => void handleRefresh()}
      >
        {/* Driver Hero Banner */}
        <View style={[styles.profileHero, { backgroundColor: colors.primary }]}>
          <View style={styles.profileAvatar}>
            <Icon name="Bike" size={38} color="#1A1D20" />
          </View>
          <Text
            style={[
              styles.profileName,
              {
                color: '#1A1D20',
                fontFamily: theme.typography.headingMedium.fontFamily,
              },
            ]}
          >
            {profile?.fullName || 'كابتن سريع'}
          </Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isAvailable ? '#1A1D20' : 'rgba(26, 29, 32, 0.15)',
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color: isAvailable ? '#FFFFFF' : '#1A1D20',
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              {isAvailable ? 'متصل ومستعد للتوصيل' : 'غير متصل حالياً'}
            </Text>
          </View>
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Stat 1: Completed Deliveries */}
          <Surface style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.primarySubtle }]}>
              <Icon name="CheckCircle2" size={18} color={colors.primaryPressed} />
            </View>
            <Text
              style={[
                styles.statValue,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.headingSmall.fontFamily,
                },
              ]}
            >
              {completedDeliveries}
            </Text>
            <Text
              style={[
                styles.statLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              رحلة مكتملة
            </Text>
          </Surface>

          {/* Stat 2: Active Areas */}
          <Surface style={styles.statCard}>
            <View style={[styles.statIconBadge, { backgroundColor: colors.primarySubtle }]}>
              <Icon name="MapPin" size={18} color={colors.primaryPressed} />
            </View>
            <Text
              style={[
                styles.statValue,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.headingSmall.fontFamily,
                },
              ]}
            >
              {areaNames.length}
            </Text>
            <Text
              style={[
                styles.statLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              نطاقات مصرحة
            </Text>
          </Surface>

          {/* Stat 3: Status */}
          <Surface style={styles.statCard}>
            <View
              style={[
                styles.statIconBadge,
                {
                  backgroundColor: isAvailable
                    ? colors.primarySubtle
                    : colors.muted,
                },
              ]}
            >
              <Icon
                name={isAvailable ? 'Zap' : 'Moon'}
                size={18}
                color={isAvailable ? colors.primaryPressed : colors.mutedForeground}
              />
            </View>
            <Text
              style={[
                styles.statValue,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.headingSmall.fontFamily,
                  fontSize: 14,
                },
              ]}
            >
              {isAvailable ? 'متصل' : 'مغلق'}
            </Text>
            <Text
              style={[
                styles.statLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              حالة الكابتن
            </Text>
          </Surface>
        </View>

        {/* Availability Toggle Section */}
        <Surface style={styles.sectionCard}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.foreground,
                fontFamily: theme.typography.headingSmall.fontFamily,
              },
            ]}
          >
            حالة استقبال الطلبات
          </Text>
          <AvailabilityToggle />
        </Surface>

        {/* Work Areas Section */}
        <Surface style={styles.sectionCard}>
          <View style={styles.areaHeader}>
            <View style={[styles.areaIconWrap, { backgroundColor: colors.primarySubtle }]}>
              <Icon name="MapPin" size={16} color={colors.primaryPressed} />
            </View>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: colors.foreground,
                  fontFamily: theme.typography.headingSmall.fontFamily,
                },
              ]}
            >
              نطاقات التوصيل المصرح بها
            </Text>
          </View>
          <Text
            style={[
              styles.areaText,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.bodyMedium.fontFamily,
              },
            ]}
          >
            {areasLoading ? 'جاري تحميل مناطق العمل…' : workAreaLabel}
          </Text>
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
          <Text
            style={[
              styles.versionText,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.caption.fontFamily,
              },
            ]}
          >
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
    backgroundColor: 'rgba(255,255,255,0.75)',
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
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    gap: 4,
  },
  statIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 22,
    gap: 10,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  areaHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  areaIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  areaText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'right',
  },
  signOutCard: {
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: 12,
  },
  brandFooter: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  footerLogo: {
    marginBottom: 4,
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
