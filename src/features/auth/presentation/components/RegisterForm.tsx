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

interface RegisterFormProps {
  returnTo?: string;
}

/**
 * Registration form: email + password + full name. No role selector —
 * every self-registered account is a customer server-side (FR-006).
 */
export function RegisterForm({ returnTo = '' }: RegisterFormProps) {
  const { signUp, refreshProfile } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateEmail(value: string) {
    setEmail(value);
    setError(null);
  }

  function updatePassword(value: string) {
    setPassword(value);
    setError(null);
  }

  function updateFullName(value: string) {
    setFullName(value);
    setError(null);
  }

  async function handleSubmit() {
    // Client-side validation fires before signUp for instant feedback (FR-015).
    if (fullName.trim().length === 0) {
      setError('Full name is required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await signUp(email.trim(), password, fullName.trim());
    if (!result.success) {
      setError(authErrorToMessage(result.error));
      setSubmitting(false);
      return;
    }
    if ('confirmationRequired' in result.data) {
      // Only reachable when email confirmation is re-enabled server-side.
      setConfirmationPending(true);
      setSubmitting(false);
      return;
    }
    const profile = await refreshProfile();
    navigateAfterAuth(returnTo, profile?.role);
  }

  if (confirmationPending) {
    return (
      <View>
        <Text style={styles.confirmationTitle}>Account created!</Text>
        <Text style={styles.confirmationText}>
          Please check your email to confirm your account before signing in.
        </Text>
        <Button
          title="Back to Login"
          variant="outline"
          onPress={() =>
            router.replace({
              pathname: '/(auth)/login',
              params: { returnTo },
            })
          }
        />
      </View>
    );
  }

  return (
    <View>
      <Input
        label="Full Name"
        value={fullName}
        onChangeText={updateFullName}
        autoComplete="name"
        placeholder="e.g. Ahmed Hassan"
      />
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
        autoComplete="new-password"
        placeholder="At least 6 characters"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title="Create Account"
        onPress={() => void handleSubmit()}
        loading={submitting}
        disabled={!email.trim() || !password || !fullName.trim()}
      />
      <Text
        style={styles.loginLink}
        onPress={() =>
          router.push({
            pathname: '/(auth)/login',
            params: { returnTo },
          })
        }
      >
        Already have an account? Sign in
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
  loginLink: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  confirmationTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  confirmationText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
});
