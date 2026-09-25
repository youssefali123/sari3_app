import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Legacy restaurant route — forwards to the unified store detail screen.
 */
export default function RestaurantRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/(customer)/(home)/store/${id}`} />;
}
