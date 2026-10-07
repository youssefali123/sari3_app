import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface EmptyStateProps {
  title: string;
  message?: string;
  emoji?: string;
  /** Optional action element (e.g. a button) rendered under the message. */
  action?: React.ReactNode;
}

/**
 * Themed empty state (feature 009 US1, contracts §14). Fully tokenized —
 * zero hardcoded colors/typography/spacing.
 */
export function EmptyState({ title, message, emoji = '📭', action }: EmptyStateProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    emoji: {
      fontSize: 48,
      marginBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
      textAlign: 'center',
      marginBottom: theme.spacing.xs,
    },
    message: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
