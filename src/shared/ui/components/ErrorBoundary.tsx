import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Root Error Boundary component adhering to Zero External UI Dependencies rule.
 * Uses only system fonts, native primitives, and inline fallback colors to guarantee
 * rendering even when the design system, custom fonts, or theme contexts crash.
 */
export function RootErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const [showDetails, setShowDetails] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeColors = {
    bg: isDark ? '#1A1915' : '#F8F9FA',
    card: isDark ? '#24231F' : '#FFFFFF',
    border: isDark ? '#38362F' : '#E5E7EB',
    text: isDark ? '#F6F4EE' : '#191816',
    muted: isDark ? '#9E9B90' : '#6B7280',
    primary: '#F5BD16',
    primaryText: '#1A1D20',
    destructive: isDark ? '#EF4444' : '#DC2626',
    codeBg: isDark ? '#141412' : '#F3F4F6',
  };

  const handleGoHome = () => {
    try {
      router.replace('/');
    } catch {
      // If router cannot navigate, retry is the remaining fallback
      void retry();
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: themeColors.bg }]}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.centerBox}>
          {/* Warning Icon Badge */}
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: isDark ? '#3D2817' : '#FEF3C7' },
            ]}
          >
            <Text style={[styles.iconText, { color: themeColors.primary }]}>
              ⚠️
            </Text>
          </View>

          {/* Heading and explanation in Arabic */}
          <Text style={[styles.title, { color: themeColors.text }]}>
            حدث خطأ غير متوقع
          </Text>
          <Text style={[styles.description, { color: themeColors.muted }]}>
            نعتذر عن هذا الخطأ، يمكنك محاولة إعادة التحميل أو العودة إلى الصفحة
            الرئيسية.
          </Text>

          {/* Dual Action Buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                {
                  backgroundColor: themeColors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => void retry()}
              accessibilityRole="button"
              accessibilityLabel="إعادة المحاولة"
            >
              <Text
                style={[
                  styles.primaryButtonText,
                  { color: themeColors.primaryText },
                ]}
              >
                إعادة المحاولة
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  borderColor: themeColors.border,
                  backgroundColor: themeColors.card,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleGoHome}
              accessibilityRole="button"
              accessibilityLabel="العودة للرئيسية"
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: themeColors.text },
                ]}
              >
                العودة للرئيسية
              </Text>
            </Pressable>
          </View>

          {/* Collapsible __DEV__ diagnostics */}
          {__DEV__ && error ? (
            <View style={styles.devSection}>
              <Pressable
                style={[
                  styles.devToggle,
                  { borderColor: themeColors.border },
                ]}
                onPress={() => setShowDetails((prev) => !prev)}
              >
                <Text style={[styles.devToggleText, { color: themeColors.muted }]}>
                  {showDetails
                    ? 'إخفاء تفاصيل الخطأ (للمطورين) ▲'
                    : 'عرض تفاصيل الخطأ (للمطورين) ▼'}
                </Text>
              </Pressable>

              {showDetails ? (
                <View
                  style={[
                    styles.devBox,
                    {
                      backgroundColor: themeColors.codeBg,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.devErrorName,
                      { color: themeColors.destructive },
                    ]}
                  >
                    {error.name}: {error.message}
                  </Text>
                  {error.stack ? (
                    <Text
                      style={[styles.devStack, { color: themeColors.muted }]}
                      numberOfLines={20}
                    >
                      {error.stack}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Expo Router layout conventions require default export or named ErrorBoundary export
export const ErrorBoundary = RootErrorBoundary;
export default RootErrorBoundary;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerBox: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconText: {
    fontSize: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    writingDirection: 'rtl',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    writingDirection: 'rtl',
    paddingHorizontal: 12,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  devSection: {
    width: '100%',
    marginTop: 28,
  },
  devToggle: {
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  devToggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
  devBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    width: '100%',
  },
  devErrorName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 6,
  },
  devStack: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
