import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  isOffline?: boolean;
  fullPage?: boolean;
}

/**
 * Themed Arabic error state component (FR-002, FR-007).
 * Displays user-friendly Arabic copy and optional retry action.
 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'إعادة المحاولة',
  isOffline = false,
  fullPage = false,
}: ErrorStateProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const displayTitle =
    title ?? (isOffline ? 'لا يتوفر اتصال بالإنترنت' : 'حدث خطأ غير متوقع');
  const displayMessage =
    message ??
    (isOffline
      ? 'يرجى التحقق من اتصالك بالشبكة وإعادة المحاولة لتحديث البيانات.'
      : 'يرجى المحاولة مرة أخرى لاحقاً.');
  const icon = isOffline ? '📡' : '⚠️';

  return (
    <View style={[styles.container, fullPage && styles.fullPage]}>
      <Text style={styles.emoji}>{icon}</Text>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry ? (
        <Button
          label={retryLabel}
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
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    message: {
      ...theme.typography.bodyMedium,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
      maxWidth: 320,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.lg,
    },
  });
