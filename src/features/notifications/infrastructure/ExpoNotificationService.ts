import Constants from 'expo-constants';
import * as ExpoNotifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/shared/lib/supabase';
import {
  AppNotification,
  NotificationPermissionStatus,
  NotificationService,
} from '../domain/services/NotificationService';

const LAST_TOKEN_KEY = 'notification_last_token';
const PENDING_REGISTRATION_KEY = 'notification_pending_registration';
const PENDING_DEACTIVATION_KEY = 'notification_pending_deactivation';
const ANDROID_CHANNEL_ID = 'order-updates';

/**
 * expo-notifications-backed implementation of the NotificationService domain
 * interface (Constitution Principle VIII). Holds NO privileged credentials —
 * the server-side dispatch pipeline is a Supabase Edge Function; this client
 * only upserts/deactivates its own token row under RLS.
 */
export class ExpoNotificationService implements NotificationService {
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const settings = await ExpoNotifications.getPermissionsAsync();
    return settings.status as NotificationPermissionStatus;
  }

  async requestPermission(): Promise<boolean> {
    // Android 13+ requires a channel to exist before the OS permission prompt.
    if (Platform.OS === 'android') {
      // No `sound` field: on Android the channel falls back to the default
      // notification sound. Passing 'default' here is rejected — the channel
      // sound property expects a bundled custom-sound file name.
      await ExpoNotifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Order updates',
        importance: ExpoNotifications.AndroidImportance.HIGH,
        enableVibrate: true,
      });
    }

    const settings = await ExpoNotifications.requestPermissionsAsync();
    return settings.granted;
  }

  async registerDevice(userId: string): Promise<void> {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.expoConfig as { extra?: { eas?: { projectId?: string } } | undefined })
        ?.extra?.eas?.projectId;

    if (!projectId) {
      // Registration cannot produce a token without the EAS project id.
      // Queue the intent so the next retry (after `eas init`) succeeds.
      await AsyncStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({ userId }));
      throw new Error('MISSING_EAS_PROJECT_ID');
    }

    if (Platform.OS === 'android') {
      // No `sound` field: on Android the channel falls back to the default
      // notification sound. Passing 'default' here is rejected — the channel
      // sound property expects a bundled custom-sound file name.
      await ExpoNotifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Order updates',
        importance: ExpoNotifications.AndroidImportance.HIGH,
        enableVibrate: true,
      });
    }

    const token = await ExpoNotifications.getExpoPushTokenAsync({ projectId });

    try {
      const { error } = await supabase.from('device_push_tokens').upsert(
        {
          user_id: userId,
          push_token: token.data,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          // Primary device language tag, e.g. "ar-EG" -> "ar" (server minimum: en/ar)
          locale: (Localization.getLocales()[0]?.languageCode ?? 'en').split('-')[0],
          is_active: true,
        },
        { onConflict: 'push_token' },
      );
      if (error) throw new Error(error.message);

      await AsyncStorage.setItem(LAST_TOKEN_KEY, token.data);
      await AsyncStorage.removeItem(PENDING_REGISTRATION_KEY);
    } catch (error) {
      // Offline / transient failure: queue for retry, never block the caller.
      await AsyncStorage.setItem(PENDING_REGISTRATION_KEY, JSON.stringify({ userId }));
      throw error;
    }
  }

  async deactivateDevice(): Promise<void> {
    const token = await AsyncStorage.getItem(LAST_TOKEN_KEY);
    if (!token) return; // nothing registered on this device

    try {
      const { error } = await supabase
        .from('device_push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('push_token', token);
      if (error) throw new Error(error.message);

      await AsyncStorage.removeItem(LAST_TOKEN_KEY);
      await AsyncStorage.removeItem(PENDING_DEACTIVATION_KEY);
    } catch (error) {
      // Offline sign-out: the session dies now; queue the server-side
      // invalidation for the next network contact (edge case FR-005).
      await AsyncStorage.setItem(
        PENDING_DEACTIVATION_KEY,
        JSON.stringify({ pushToken: token }),
      );
      await AsyncStorage.removeItem(LAST_TOKEN_KEY);
      throw error;
    }
  }

  /**
   * Replays queued intents (failed registration / offline deactivation).
   * Called by useNotificationSetup on app foreground or network restoration.
   */
  async retryPending(): Promise<void> {
    const pendingDeactivation = await AsyncStorage.getItem(PENDING_DEACTIVATION_KEY);
    if (pendingDeactivation) {
      const { pushToken } = JSON.parse(pendingDeactivation) as { pushToken: string };
      const { error } = await supabase
        .from('device_push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('push_token', pushToken);
      if (!error) {
        await AsyncStorage.removeItem(PENDING_DEACTIVATION_KEY);
      }
    }

    const pendingRegistration = await AsyncStorage.getItem(PENDING_REGISTRATION_KEY);
    if (pendingRegistration) {
      const { userId } = JSON.parse(pendingRegistration) as { userId: string };
      try {
        await this.registerDevice(userId); // clears the flag on success
      } catch {
        // Keep the intent queued; retried again on the next trigger.
      }
    }
  }

  onNotificationReceived(
    callback: (notification: AppNotification) => void,
  ): () => void {
    const subscription = ExpoNotifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      callback({
        title: content.title ?? '',
        body: content.body ?? '',
        data: (content.data as Record<string, unknown>) ?? undefined,
      });
    });
    return () => subscription.remove();
  }

  onNotificationTapped(
    callback: (notification: AppNotification) => void,
  ): () => void {
    const subscription = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
      const content = response.notification.request.content;
      callback({
        title: content.title ?? '',
        body: content.body ?? '',
        data: (content.data as Record<string, unknown>) ?? undefined,
      });
    });
    return () => subscription.remove();
  }
}
