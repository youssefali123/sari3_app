import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors, useTheme } from '../theme';
import { ThemePreference } from '../context';
import { Icon } from './Icon';
import { Surface } from './AppUI';

interface ThemeOption {
  key: ThemePreference;
  label: string;
  icon: string;
  description: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    key: 'system',
    label: 'تلقائي',
    icon: 'Smartphone',
    description: 'مطابقة الهاتف',
  },
  {
    key: 'light',
    label: 'فاتح',
    icon: 'Sun',
    description: 'الوضع النهاري',
  },
  {
    key: 'dark',
    label: 'داكن',
    icon: 'Moon',
    description: 'الوضع الليلي',
  },
] as const;

export interface ThemeSelectorCardProps {
  style?: object;
}

/**
 * Premium Segmented Theme Selector Card (Feature: Appearance Preferences).
 * Provides one-tap switching between System, Light, and Dark themes with
 * tactile haptics, Tajawal typography, and smooth instant reactivity.
 */
export function ThemeSelectorCard({ style }: ThemeSelectorCardProps) {
  const { theme, isDark, themePreference, setThemePreference } = useTheme();
  const colors = useColors();

  const handleSelect = async (pref: ThemePreference) => {
    if (pref === themePreference) return;
    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Haptics optional on unsupported devices
    }
    await setThemePreference(pref);
  };

  return (
    <Surface style={[styles.container, style]}>
      {/* Header section */}
      <View style={styles.headerRow}>
        <View style={styles.headerTexts}>
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontFamily: theme.typography.label.fontFamily,
              },
            ]}
          >
            مظهر التطبيق
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.mutedForeground,
                fontFamily: theme.typography.caption.fontFamily,
              },
            ]}
          >
            اختر المظهر المفضل لك أو دع التطبيق يتبع إعدادات الهاتف
          </Text>
        </View>
        <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
          <Icon name="SunMoon" size={20} color={colors.primary} />
        </View>
      </View>

      {/* Segmented control track */}
      <View
        style={[
          styles.segmentedTrack,
          {
            backgroundColor: isDark ? '#2A2925' : '#F1F3F5',
            borderColor: colors.border,
          },
        ]}
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = themePreference === option.key;

          return (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.segmentPill,
                isSelected && [
                  styles.segmentPillActive,
                  {
                    backgroundColor: colors.primary,
                    shadowColor: colors.primary,
                  },
                ],
              ]}
              onPress={() => void handleSelect(option.key)}
              activeOpacity={0.85}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${option.label} (${option.description})`}
            >
              <Icon
                name={option.icon}
                size={18}
                color={isSelected ? '#1A1816' : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    color: isSelected ? '#1A1816' : colors.mutedForeground,
                    fontFamily: isSelected
                      ? theme.typography.label.fontFamily
                      : theme.typography.caption.fontFamily,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 20,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'right',
    lineHeight: 16,
  },
  segmentedTrack: {
    flexDirection: 'row-reverse',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  segmentPillActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  segmentLabel: {
    fontSize: 13,
  },
});
