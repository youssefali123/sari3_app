import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SectionHeaderProps {
  title: string;
  /** Optional action element (e.g. "See all" link) rendered on the end side. */
  action?: React.ReactNode;
}

/**
 * Themed section header (feature 009 US4, contracts §12): title in
 * headingSmall with an optional action on the end side.
 */
export function SectionHeader({ title, action }: SectionHeaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {action}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
    },
  });
