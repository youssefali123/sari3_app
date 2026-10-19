import React from 'react';
import { Platform, StatusBar, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/shared/ui/components/Icon';
import { useColors, useTheme } from '@/shared/ui/theme';
import { useNetworkStatus } from '../../application/hooks/useNetworkStatus';

/**
 * Persistent offline notice rendered above driver screens. Hidden entirely
 * while connected — it never occupies layout space for online drivers.
 */
export function OfflineNoticeBanner() {
  const { isConnected } = useNetworkStatus();
  const colors = useColors();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (isConnected) return null;

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 0,
  );

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.destructive,
          paddingTop: topInset + 6,
        },
      ]}
    >
      <Icon name="WifiOff" size={16} color="#FFFFFF" />
      <Text
        style={[
          styles.text,
          {
            color: '#FFFFFF',
            fontFamily: theme.typography.bodySmall.fontFamily,
          },
        ]}
      >
        لا يوجد اتصال بالإنترنت، يرجى التحقق من الشبكة
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
