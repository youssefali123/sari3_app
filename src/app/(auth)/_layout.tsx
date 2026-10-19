import { Stack } from 'expo-router';
import { screenTransitions } from '@/shared/ui/motion';
import { useTheme } from '@/shared/ui/context/ThemeContext';

export default function AuthLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...screenTransitions.horizontal,
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          ...screenTransitions.horizontal,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </Stack>
  );
}
