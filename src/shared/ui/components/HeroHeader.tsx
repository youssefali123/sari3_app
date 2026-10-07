import React from 'react';
import {
  I18nManager,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface HeroHeaderProps {
  /** Full-bleed image; a letter fallback renders when absent. */
  imageUri?: string | null;
  /** Letter/emoji shown inside the fallback block (first char of the name). */
  fallbackText?: string;
  /** Header height in px (default 230). */
  height?: number;
  onBack: () => void;
  /** Extra circle actions rendered at the end side (favorite, share…). */
  actions?: React.ReactNode;
  /** Optional full-width notice under the image (e.g. closed-store). */
  banner?: string | null;
}

/**
 * Full-bleed image header with overlaid circle controls (feature 011 design
 * identity — shared by store detail and product detail). The back chevron
 * mirrors automatically under RTL; the safe-area top inset keeps the
 * controls below the status bar/notch.
 */
export function HeroHeader({
  imageUri,
  fallbackText,
  height = 230,
  onBack,
  actions,
  banner,
}: HeroHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  return (
    <View>
      <View style={[styles.hero, { height }]}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.fallback]}>
            <Text style={styles.fallbackText}>{fallbackText ?? '?'}</Text>
          </View>
        )}
        <View style={[styles.controls, { top: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.circle}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            {/* Back points opposite to reading direction; mirrors in RTL. */}
            <Text style={styles.chevron}>
              {I18nManager.isRTL ? '›' : '‹'}
            </Text>
          </TouchableOpacity>
          <View style={styles.actions}>{actions}</View>
        </View>
      </View>
      {banner ? (
        <View style={styles.bannerWrap}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    hero: {
      backgroundColor: theme.colors.disabled,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    fallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackText: {
      ...theme.typography.display,
      color: theme.colors.textMuted,
    },
    controls: {
      position: 'absolute',
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    circle: {
      width: 40,
      height: 40,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.medium,
    },
    chevron: {
      fontSize: 22,
      lineHeight: 26,
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    bannerWrap: {
      backgroundColor: theme.colors.overlay,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    bannerText: {
      ...theme.typography.label,
      color: theme.colors.textInverse,
    },
  });
