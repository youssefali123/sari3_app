import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';
import { useDriverAvailability } from '../../application/hooks/useDriverAvailability';

/**
 * Available / Offline switch bound to the driver's server-side availability.
 * The switch position always reflects the last confirmed server state; while
 * a toggle request is in flight it is disabled (no optimistic writes offline,
 * FR-016).
 */
export function AvailabilityToggle() {
  const { isAvailable, toggle, isToggling, error } = useDriverAvailability();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>
          {isAvailable ? 'Available' : 'Offline'}
        </Text>
        {isToggling ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Switch
            value={isAvailable}
            onValueChange={toggle}
            disabled={isToggling}
            trackColor={{ false: colors.disabled, true: colors.success }}
            thumbColor={colors.white}
          />
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error.message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
