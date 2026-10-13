import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, useColors } from '../theme';
import { Icon } from './Icon';

export interface EmptyStateProps {
  title: string;
  message?: string;
  emoji?: string;
  icon?: string;
  /** Optional action element (e.g. a button) rendered under the message. */
  action?: React.ReactNode;
}

/**
 * Themed empty state (feature 009 US1, contracts §14). Fully tokenized —
 * supports Lucide icons with Sari3 brand gold badges as well as emoji fallbacks.
 */
export function EmptyState({
  title,
  message,
  emoji,
  icon,
  action,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const colors = useColors();

  return (
    <View style={styles.container}>
      {icon ? (
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: colors.primarySubtle,
              borderColor: 'rgba(245, 189, 22, 0.35)',
            },
          ]}
        >
          <Icon name={icon} size={28} color={colors.primaryPressed} />
        </View>
      ) : emoji ? (
        <Text style={styles.emoji}>{emoji}</Text>
      ) : (
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: colors.primarySubtle,
              borderColor: 'rgba(245, 189, 22, 0.35)',
            },
          ]}
        >
          <Icon name="Inbox" size={28} color={colors.primaryPressed} />
        </View>
      )}

      <Text
        style={[
          styles.title,
          {
            color: colors.foreground,
            fontFamily: theme.typography.headingSmall.fontFamily,
          },
        ]}
      >
        {title}
      </Text>

      {message ? (
        <Text
          style={[
            styles.message,
            {
              color: colors.mutedForeground,
              fontFamily: theme.typography.bodyMedium.fontFamily,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}

      {action ? <View style={styles.actionWrap}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  actionWrap: {
    marginTop: 18,
    width: '100%',
    maxWidth: 300,
  },
});
