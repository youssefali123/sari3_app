import { Alert, Platform } from 'react-native';

/**
 * Cross-platform informational alert. Alert.alert is a no-op on
 * react-native-web, so web falls back to window.alert.
 */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
