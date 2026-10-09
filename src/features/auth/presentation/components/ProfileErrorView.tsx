import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../application/hooks/useAuth';
import { Icon } from '@/shared/ui/components/Icon';
import { PrimaryButton } from '@/shared/ui/components/AppUI';
import { useColors, useTheme } from '@/shared/ui/theme';

/**
 * Rendered when an authenticated user's profile row cannot be loaded.
 * Tailored to Sari3 brand identity with Arabic typography and semantic styling.
 */
export function ProfileErrorView() {
  const { refreshProfile, signOut } = useAuth();
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconBadge, { backgroundColor: 'rgba(201, 79, 72, 0.12)', borderColor: 'rgba(201, 79, 72, 0.25)' }]}>
        <Icon name="TriangleAlert" size={32} color={colors.destructive} />
      </View>
      <Text
        style={[
          styles.title,
          {
            color: colors.foreground,
            fontFamily: theme.typography.headingMedium.fontFamily,
          },
        ]}
      >
        تعذر تحميل بيانات الحساب
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.mutedForeground,
            fontFamily: theme.typography.bodyMedium.fontFamily,
          },
        ]}
      >
        حدث خطأ غير متوقع أثناء تحميل بيانات ملفك الشخصي. يرجى إعادة المحاولة أو تسجيل الخروج.
      </Text>
      <View style={styles.actions}>
        <PrimaryButton
          title="إعادة المحاولة"
          icon="refresh-outline"
          onPress={() => void refreshProfile()}
        />
        <PrimaryButton
          title="تسجيل الخروج"
          tone="outline"
          onPress={() => void signOut()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    maxWidth: 300,
    gap: 12,
  },
});
