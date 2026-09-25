import { Unsubscribe } from '@/shared/types/common';

/**
 * Represents a notification delivered to the user.
 */
export interface AppNotification {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Abstraction for push notification operations.
 * Infrastructure implements this using the selected notification provider.
 */
export interface NotificationService {
  /** Request notification permission from the user. Returns true if granted. */
  requestPermission(): Promise<boolean>;

  /** Check current permission status without prompting. */
  getPermissionStatus(): Promise<NotificationPermissionStatus>;

  /**
   * Register the device for push notifications and store the token server-side.
   * Performs upsert — safe to call multiple times for the same device.
   * Captures the device OS locale and sends it with the upsert (the server
   * reads the stored locale per token at dispatch).
   * If the network call fails, queues the registration for retry.
   */
  registerDevice(userId: string): Promise<void>;

  /**
   * Deactivate the current device's push token on the server.
   * Called during the sign-out sequence.
   * If offline, queues deactivation for next network contact.
   */
  deactivateDevice(): Promise<void>;

  /** Listen for notifications received while the app is foregrounded. */
  onNotificationReceived(callback: (notification: AppNotification) => void): Unsubscribe;

  /** Listen for when the user taps on a notification. */
  onNotificationTapped(callback: (notification: AppNotification) => void): Unsubscribe;
}
