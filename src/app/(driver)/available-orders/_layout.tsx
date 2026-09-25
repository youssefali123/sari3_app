import { Stack } from 'expo-router';

export default function AvailableOrdersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Available Orders' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order Details' }} />
    </Stack>
  );
}
