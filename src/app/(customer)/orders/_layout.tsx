import { Stack } from 'expo-router';

export default function OrdersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'My Orders' }} />
      <Stack.Screen name="[id]" options={{ title: 'Order Details' }} />
    </Stack>
  );
}
