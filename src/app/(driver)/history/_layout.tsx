import { Stack } from 'expo-router';

export default function DriverHistoryLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Delivery History' }} />
      <Stack.Screen name="[id]" options={{ title: 'Delivery Details' }} />
    </Stack>
  );
}
