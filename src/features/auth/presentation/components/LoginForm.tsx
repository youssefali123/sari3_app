import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../application/hooks/useAuth';
import { authErrorToMessage } from './authErrorToMessage';
import { navigateAfterAuth } from './postAuthRouting';
import { Input } from '@/shared/ui/components/Input';
import { PrimaryButton } from '@/shared/ui/components/AppUI';
import { Icon } from '@/shared/ui/components/Icon';
import { useColors, useTheme } from '@/shared/ui/theme';

interface LoginFormProps {
  returnTo?: string;
}

/**
 * Combined sign-in form for all roles.
 * Styled to match Sari3 brand identity with Arabic typography,
 * password visibility toggling, leading icons, and haptic-ready buttons.
 */
export function LoginForm({ returnTo = '' }: LoginFormProps) {
  const { signIn, refreshProfile } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    Keyboard.dismiss();
    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    if (!result.success) {
      setError(authErrorToMessage(result.error));
      setSubmitting(false);
      return;
    }
    const profile = await refreshProfile();
    navigateAfterAuth(returnTo, profile?.role);
  }

  return (
    <View style={styles.form}>
      <Input
        label="البريد الإلكتروني"
        value={email}
        onChangeText={updateEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        placeholder="name@example.com"
        leadingIcon={<Icon name="Mail" size={18} color={colors.mutedForeground} />}
        style={styles.ltrInput}
        testID="login-email-input"
      />

      <Input
        label="كلمة المرور"
        value={password}
        onChangeText={updatePassword}
        secureTextEntry={!showPassword}
        autoComplete="password"
        placeholder="••••••••"
        leadingIcon={<Icon name="Lock" size={18} color={colors.mutedForeground} />}
        trailingAction={
          <Pressable
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          >
            <Icon
              name={showPassword ? 'EyeOff' : 'Eye'}
              size={18}
              color={colors.mutedForeground}
            />
          </Pressable>
        }
        style={styles.ltrInput}
        testID="login-password-input"
      />

      {error ? (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: 'rgba(201, 79, 72, 0.1)',
              borderColor: 'rgba(201, 79, 72, 0.25)',
            },
          ]}
        >
          <Icon name="TriangleAlert" size={16} color={colors.destructive} />
          <Text
            style={[
              styles.errorText,
              {
                color: colors.destructive,
                fontFamily: theme.typography.caption.fontFamily,
              },
            ]}
          >
            {error}
          </Text>
        </View>
      ) : null}

      <View style={styles.submitWrap}>
        <PrimaryButton
          title="تسجيل الدخول"
          icon="log-in-outline"
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={!email.trim() || !password}
          testID="login-submit-button"
        />
      </View>

      <View style={styles.switchRow}>
        <Text
          style={[
            styles.switchLabel,
            {
              color: colors.mutedForeground,
              fontFamily: theme.typography.bodyMedium.fontFamily,
            },
          ]}
        >
          ليس لديك حساب بعد؟
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(auth)/register',
              params: { returnTo },
            })
          }
          hitSlop={6}
        >
          <Text
            style={[
              styles.switchAction,
              {
                color: colors.primaryPressed,
                fontFamily: theme.typography.button.fontFamily,
              },
            ]}
          >
            إنشاء حساب جديد
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 4,
  },
  ltrInput: {
    textAlign: 'left',
  },
  errorBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  submitWrap: {
    marginTop: 12,
  },
  switchRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  switchLabel: {
    fontSize: 14,
  },
  switchAction: {
    fontSize: 14,
    fontWeight: '700',
  },
});
