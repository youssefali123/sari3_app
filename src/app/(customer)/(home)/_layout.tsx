import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Home' }} />
      <Stack.Screen name="store/[id]" options={{ title: 'Store' }} />
      <Stack.Screen name="promotion/[id]" options={{ title: 'Promotion' }} />
    </Stack>
  );
}
