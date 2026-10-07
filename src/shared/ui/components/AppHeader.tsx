import React from 'react';
import {
  I18nManager,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Icon } from './Icon';

interface AppHeaderProps {
  /** Screen title (also used as the accessibility label anchor). */
  title?: string;
  /** Optional secondary line under the title. */
  subtitle?: string;
  /** When provided, renders the RTL-aware back circle button. */
  onBack?: () => void;
  /** Trailing actions (icons, buttons) rendered on the end side. */
  actions?: React.ReactNode;
  /** Center the title block (tab-root screens with no back button). */
  centered?: boolean;
  /**
   * Overlay mode (feature 011): absolutely positioned at the screen top with
   * safe-area padding and a hairline divider — used for bars that appear
   * above pinned content while scrolling.
   */
  floating?: boolean;
}

/**
 * The application top bar (feature 011 design identity) — ONE header for
 * every screen: back circle (mirrored under RTL), title/subtitle in the
 * brand typography, and a flexible actions slot. All values come from the
 * theme; editing this component updates every screen that uses it.
 */
export function AppHeader({
  title,
  subtitle,
  onBack,
  actions,
  centered = false,
  floating = false,
}: AppHeaderProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme);

  return (
    <View
      style={[
        styles.container,
        centered && styles.centered,
        floating && styles.floating,
        // The top inset ALWAYS applies: screens render edge-to-edge, so the
        // bar content must clear the status bar/notch in every mode.
        { paddingTop: insets.top },
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <TouchableOpacity
            style={styles.circle}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            {/* Back points opposite to reading direction; mirrors in RTL. */}
            <Icon
              name={I18nManager.isRTL ? 'ChevronRight' : 'ChevronLeft'}
              size={20}
              accessibilityHidden
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.circlePlaceholder} />
        )}
        <View style={[styles.titleTexts, centered && styles.titleTextsCentered]}>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>{actions}</View>
      </View>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
    },
    centered: {
      // Center the title block: equal placeholder slots on both sides.
      // (The back/actions slots keep their intrinsic widths.)
    },
    floating: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      elevation: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.divider,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minHeight: 52,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
    circle: {
      width: 40,
      height: 40,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circlePlaceholder: {
      width: 40,
    },
    titleTexts: {
      flex: 1,
      alignItems: 'flex-start',
      minWidth: 0,
    },
    titleTextsCentered: {
      alignItems: 'center',
    },
    title: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
    },
    subtitle: {
      ...theme.typography.caption,
      color: theme.colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      minWidth: 0,
    },
  });
