import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { typography } from '@/shared/ui/theme/typography';
import { useNetworkStatus } from '../../application/hooks/useNetworkStatus';

/**
 * Persistent offline notice rendered above driver screens. Hidden entirely
 * while connected — it never occupies layout space for online drivers.
 */
export function OfflineNoticeBanner() {
  const { isConnected } = useNetworkStatus();

  if (isConnected) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningLight,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  text: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
