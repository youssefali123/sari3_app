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

interface RegisterFormProps {
  returnTo?: string;
}

/**
 * Registration form: email + password + full name.
 * Styled to match Sari3 brand identity with Arabic typography,
 * password visibility toggling, leading icons, and validation.
 */
export function RegisterForm({ returnTo = '' }: RegisterFormProps) {
  const { signUp, refreshProfile } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    Keyboard.dismiss();
    if (fullName.trim().length === 0) {
      setError('يرجى إدخال الاسم الكامل.');
      return;
    }
    if (email.trim().length === 0) {
      setError('يرجى إدخال البريد الإلكتروني.');
      return;
    }
    if (password.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.');
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
      setConfirmationPending(true);
      setSubmitting(false);
      return;
    }
    const profile = await refreshProfile();
    navigateAfterAuth(returnTo, profile?.role);
  }

  if (confirmationPending) {
    return (
      <View style={styles.confirmationWrap}>
        <View
          style={[
            styles.successBadge,
            {
              backgroundColor: colors.primarySubtle,
              borderColor: 'rgba(245, 189, 22, 0.4)',
            },
          ]}
        >
          <Icon name="Mail" size={32} color={colors.primaryPressed} />
        </View>
        <Text
          style={[
            styles.confirmationTitle,
            {
              color: colors.foreground,
              fontFamily: theme.typography.headingMedium.fontFamily,
            },
          ]}
        >
          تم إنشاء الحساب بنجاح!
        </Text>
        <Text
          style={[
            styles.confirmationText,
            {
              color: colors.mutedForeground,
              fontFamily: theme.typography.bodyMedium.fontFamily,
            },
          ]}
        >
          يرجى مراجعة بريدك الإلكتروني لتأكيد حسابك قبل تسجيل الدخول.
        </Text>
        <PrimaryButton
          title="الانتقال لتسجيل الدخول"
          tone="primary"
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
    <View style={styles.form}>
      <Input
        label="الاسم الكامل"
        value={fullName}
        onChangeText={updateFullName}
        autoComplete="name"
        placeholder="مثال: أحمد محمد"
        leadingIcon={<Icon name="User" size={18} color={colors.mutedForeground} />}
        testID="register-name-input"
      />

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
        testID="register-email-input"
      />

      <Input
        label="كلمة المرور"
        value={password}
        onChangeText={updatePassword}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        placeholder="6 أحرف على الأقل"
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
        testID="register-password-input"
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
          title="إنشاء حساب جديد"
          icon="checkmark-circle-outline"
          onPress={() => void handleSubmit()}
          loading={submitting}
          disabled={!email.trim() || !password || !fullName.trim()}
          testID="register-submit-button"
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
          لديك حساب بالفعل؟
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/(auth)/login',
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
            تسجيل الدخول
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
  confirmationWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  successBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
});
