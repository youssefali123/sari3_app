import React from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';
import { useColors } from '@/shared/ui/hooks/useColors';
import { Surface } from '@/shared/ui/components/AppUI';
import { useDriverAvailability } from '../../application/hooks/useDriverAvailability';

/**
 * Available / Offline switch bound to the driver's server-side availability.
 * Elevated to SOURCE design language with RTL layout and Arabic status labels.
 */
export function AvailabilityToggle() {
  const { isAvailable, toggle, isToggling, error } = useDriverAvailability();
  const colors = useColors();

  return (
    <View style={styles.container}>
      <Surface
        style={[
          styles.card,
          {
            backgroundColor: isAvailable ? colors.secondary : colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.row}>
          <View style={styles.statusInfo}>
            <View style={styles.titleRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isAvailable ? colors.secondaryForeground : colors.mutedForeground },
                ]}
              />
              <Text
                style={[
                  styles.label,
                  {
                    color: isAvailable ? colors.secondaryForeground : colors.foreground,
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
                  color: isAvailable ? colors.secondaryForeground + 'B3' : colors.mutedForeground,
                },
              ]}
            >
              {isAvailable
                ? 'أنت جاهز لتلقي طلبات التوصيل الجديدة'
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
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={colors.foreground}
            />
          )}
        </View>
      </Surface>
      {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error.message}</Text> : null}
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
    borderRadius: 18,
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
    width: 8,
    height: 8,
    borderRadius: 4,
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
