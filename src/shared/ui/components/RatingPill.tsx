import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface RatingPillProps {
  /** Rating between 0.0 and 5.0. */
  rating: number;
}

/**
 * Green-star rating pill (feature 011 design identity): value + ★ on a
 * success-tinted capsule. Shared by the store info card and list cards.
 */
export function RatingPill({ rating }: RatingPillProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.pill} accessibilityLabel={`التقييم ${rating.toFixed(1)} من 5`}>
      <Text style={styles.value}>{rating.toFixed(1)}</Text>
      <Text style={styles.star} accessible={false}>
        ★
      </Text>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: theme.colors.successSubtle,
      borderRadius: theme.radii.pill,
      paddingHorizontal: theme.spacing.sm + 2,
      paddingVertical: theme.spacing.xs,
    },
    value: {
      ...theme.typography.numeric,
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
    star: {
      fontSize: 13,
      color: theme.colors.success,
    },
  });
