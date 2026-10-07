import React from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
// Namespace import: reliable across platforms (the default export shape
// differs between the native and web bundler resolutions).
import * as LucideIcons from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export type IconName = string;

/**
 * Directional icons auto-mirrored in RTL layouts (feature 009 contracts §5).
 */
export const RTL_DIRECTIONAL_ICONS = [
  'ChevronLeft',
  'ChevronRight',
  'ArrowLeft',
  'ArrowRight',
  'MoveLeft',
  'MoveRight',
  'SkipBack',
  'SkipForward',
] as const;

type LucideIconComponent = React.ComponentType<{
  size: number;
  color: string;
  strokeWidth?: number;
}>;

const LUCIDE_ICONS: Record<string, LucideIconComponent> =
  LucideIcons as unknown as Record<string, LucideIconComponent>;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Stroke width override (lucide's line weight — default 2). */
  strokeWidth?: number;
  accessibilityLabel?: string;
  /** true for decorative icons hidden from screen readers. */
  accessibilityHidden?: boolean;
  testID?: string;
}

/**
 * Shared icon (feature 009 US1, contracts §5) — real lucide stroke icons
 * rendered through react-native-svg. Color defaults to the theme
 * textPrimary. Directional icons auto-mirror in RTL via scaleX flip.
 */
export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 2,
  accessibilityLabel,
  accessibilityHidden = false,
  testID,
}: IconProps) {
  const { theme } = useTheme();
  const resolvedColor = color ?? theme.colors.textPrimary;

  const IconComponent = LUCIDE_ICONS[name];
  if (!IconComponent) {
    if (__DEV__) {
      console.warn(`Icon: unknown icon name "${name}"`);
    }
    return null;
  }

  const isDirectional = (RTL_DIRECTIONAL_ICONS as readonly string[]).includes(name);
  const transform = isDirectional && I18nManager.isRTL
    ? [{ scaleX: -1 }]
    : undefined;

  return (
    <View
      style={transform ? styles.mirror : undefined}
      accessible={!accessibilityHidden}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={accessibilityHidden}
      importantForAccessibility={accessibilityHidden ? 'no-hide-descendants' : undefined}
      testID={testID}
    >
      <IconComponent size={size} color={resolvedColor} strokeWidth={strokeWidth} />
    </View>
  );
}

const styles = StyleSheet.create({
  mirror: {
    transform: [{ scaleX: -1 }],
  },
});
