import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RegisterForm } from '@/features/auth/presentation/components/RegisterForm';
import { colors } from '@/shared/ui/theme/colors';
import { spacing } from '@/shared/ui/theme/spacing';
import { typography } from '@/shared/ui/theme/typography';

export default function RegisterScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join Sari3 today</Text>
      <View style={styles.formContainer}>
        <RegisterForm returnTo={returnTo ?? ''} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
  },
});
