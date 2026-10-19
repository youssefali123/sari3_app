import { Stack } from 'expo-router';
import { screenTransitions } from '@/shared/ui/motion';
import { useTheme } from '@/shared/ui/context/ThemeContext';

export default function FavoritesLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        ...screenTransitions.horizontal,
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen
        name="stores"
        options={{
          ...screenTransitions.horizontal,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
      <Stack.Screen
        name="products"
        options={{
          ...screenTransitions.horizontal,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </Stack>
  );
}
