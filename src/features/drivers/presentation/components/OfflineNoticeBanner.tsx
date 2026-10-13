import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

  if (isConnected) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.destructive,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 16,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
