import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { useColors, useTheme } from '@/shared/ui/theme';
import { Surface } from '@/shared/ui/components/AppUI';
import { useDriverAvailability } from '../../application/hooks/useDriverAvailability';
import { classifyDriverError } from '../../infrastructure/driverErrorClassifier';
import { getDriverErrorMessage } from '../messages/driversErrorMessages.ar';

/**
 * Available / Offline switch bound to the driver's server-side availability.
 * Elevated to Sari3 design language with RTL layout, brand gold accents, and Tajawal typography.
 */
export function AvailabilityToggle() {
  const { isAvailable, toggle, isToggling, error } = useDriverAvailability();
  const colors = useColors();
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Surface
        style={[
          styles.card,
          {
            backgroundColor: isAvailable ? colors.primarySubtle : colors.card,
            borderColor: isAvailable ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.statusInfo}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isAvailable ? '#27AE60' : colors.mutedForeground,
                  },
                ]}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: colors.foreground,
                    fontFamily: theme.typography.headingSmall.fontFamily,
                  },
                ]}
              >
                {isAvailable ? 'متاح للعمل (متصل)' : 'غير متاح (غير متصل)'}
              </Text>
            </View>
            <Text
              style={[
                styles.subtitle,
                {
                  color: isAvailable ? colors.foreground : colors.mutedForeground,
                  fontFamily: theme.typography.caption.fontFamily,
                },
              ]}
            >
              {isAvailable
                ? 'أنت جاهز لتلقي طلبات التوصيل الجديدة حولك'
                : 'قم بتفعيل المفتاح لبدء استقبال الطلبات'}
            </Text>
          </View>

          {isToggling ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Switch
              value={isAvailable}
              onValueChange={toggle}
              disabled={isToggling}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isAvailable ? '#1A1D20' : colors.card}
            />
          )}
        </View>
      </Surface>
      {error ? (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.destructive,
              fontFamily: theme.typography.caption.fontFamily,
            },
          ]}
        >
          {getDriverErrorMessage(classifyDriverError(error).kind)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  card: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statusInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'right',
  },
  errorText: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
    paddingHorizontal: 4,
  },
});
