import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  fullPage?: boolean;
}

/**
 * Themed error state (feature 009 US1, contracts §15). Fully tokenized.
 * `ErrorView` remains as a re-export alias for backwards compatibility.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again.',
  onRetry,
  fullPage = false,
}: ErrorStateProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={[styles.container, fullPage && styles.fullPage]}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button
          label="Retry"
          variant="outlined"
          onPress={onRetry}
          style={styles.retryButton}
        />
      ) : null}
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    fullPage: {
      flex: 1,
    },
    emoji: {
      fontSize: 40,
      marginBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.headingSmall,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.sm,
    },
    message: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.lg,
    },
  });
