import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../application/hooks/useAuth';
import { authErrorToMessage } from './authErrorToMessage';
import { navigateAfterAuth } from './postAuthRouting';
import { Input } from '@/shared/ui/components/Input';
import { Button } from '@/shared/ui/components/Button';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

interface LoginFormProps {
  returnTo?: string;
}

/**
 * Combined sign-in form for all roles. Role-based routing happens after
 * sign-in from the server-side profile — no role selection UI here (FR-007).
 */
export function LoginForm({ returnTo = '' }: LoginFormProps) {
  const { signIn, refreshProfile } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateEmail(value: string) {
    setEmail(value);
    setError(null);
  }

  function updatePassword(value: string) {
    setPassword(value);
    setError(null);
  }

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    if (!result.success) {
      setError(authErrorToMessage(result.error));
      setSubmitting(false);
      return;
    }
    // Duplicate profile fetch is intentional: routing needs the role now,
    // and the context listener refreshes it independently.
    const profile = await refreshProfile();
    navigateAfterAuth(returnTo, profile?.role);
  }

  return (
    <View>
      <Input
        label="Email"
        value={email}
        onChangeText={updateEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <Input
        label="Password"
        value={password}
        onChangeText={updatePassword}
        secureTextEntry
        autoComplete="password"
        placeholder="Your password"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Sign In"
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!email.trim() || !password}
      />
      <Text
        style={styles.registerLink}
        onPress={() =>
          router.push({
            pathname: '/(auth)/register',
            params: { returnTo },
          })
        }
      >
        Don&apos;t have an account? Register
      </Text>
      {/* Escape hatch for guests who landed here via a protected action
          (FR-003 keeps guest browsing open; auth is only for protected actions). */}
      <Text
        style={styles.guestLink}
        onPress={() => router.replace('/(customer)/(home)')}
      >
        Continue as guest
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.bodySmall,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  registerLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  guestLink: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
