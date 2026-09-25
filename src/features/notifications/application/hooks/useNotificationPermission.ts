import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpoNotificationService } from '../../infrastructure/ExpoNotificationService';

const PROMPTED_FLAG = 'notification_permission_prompted';

const notificationService = new ExpoNotificationService();

/**
 * Contextual permission prompting (FR-013): the OS prompt fires exactly once
 * per device, only at a high-intent moment — after the customer's first
 * successful order or the driver's first toggle to Available. Denial never
 * blocks anything (FR-014); the flag is device-local transient state.
 *
 * Call `maybePromptAndRegister(userId)` from those success callbacks.
 */
export async function maybePromptAndRegister(userId: string): Promise<void> {
  try {
    const prompted = await AsyncStorage.getItem(PROMPTED_FLAG);
    if (prompted === 'true') return;

    await AsyncStorage.setItem(PROMPTED_FLAG, 'true');
    const granted = await notificationService.requestPermission();
    if (granted) {
      await notificationService.registerDevice(userId).catch(() => {
        // queued by the service; retried on next network restoration
      });
    }
  } catch {
    // Never let notification setup break the order/toggle flow (FR-014).
  }
}
