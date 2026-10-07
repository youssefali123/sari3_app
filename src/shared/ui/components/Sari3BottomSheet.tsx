import React from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, { BottomSheetProps } from '@gorhom/bottom-sheet';
import { useTheme } from '../context/ThemeContext';
import { bottomSheetAnimationConfigs } from '@/shared/ui/motion';

interface Sari3BottomSheetProps {
  snapPoints: BottomSheetProps['snapPoints'];
  children: React.ReactNode;
  onClose: () => void;
  enablePanDownToClose?: boolean;
  index?: number;
}

/**
 * Themed bottom sheet (feature 009 US5, contracts §16). Wraps
 * @gorhom/bottom-sheet with Sari3 tokens: elevated surface, extra-large top
 * radii, styled handle. NO blur, NO glass effects. Pan-down-to-close is
 * enabled by default. Requires GestureHandlerRootView + Reanimated (both
 * wired at the app root).
 *
 * Sheet motion (feature 010 FR-013): open/close/snap timing comes from the
 * shared `bottomSheetAnimationConfigs`; drag physics stay 100% gorhom.
 */
export function Sari3BottomSheet({
  snapPoints,
  children,
  onClose,
  enablePanDownToClose = true,
  index = 0,
}: Sari3BottomSheetProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <BottomSheet
      snapPoints={snapPoints}
      index={index}
      animationConfigs={bottomSheetAnimationConfigs}
      enablePanDownToClose={enablePanDownToClose}
      onClose={onClose}
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.background}
      handleStyle={styles.handle}
    >
      <View style={styles.content}>{children}</View>
    </BottomSheet>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    background: {
      backgroundColor: theme.colors.surfaceElevated,
    },
    handle: {
      paddingTop: theme.spacing.sm,
    },
    handleIndicator: {
      backgroundColor: theme.colors.border,
      width: 40,
    },
    content: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
      borderTopLeftRadius: theme.radii.extraLarge,
      borderTopRightRadius: theme.radii.extraLarge,
    },
  });
