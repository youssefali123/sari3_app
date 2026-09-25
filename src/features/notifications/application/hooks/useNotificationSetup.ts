import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as ExpoNotifications from 'expo-notifications';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { useNetworkStatus } from '@/features/drivers/application/hooks/useNetworkStatus';
import { ExpoNotificationService } from '../../infrastructure/ExpoNotificationService';
import { AppNotification } from '../../domain/services/NotificationService';

const notificationService = new ExpoNotificationService();

/**
 * App-level notification wiring (mounted once from the root layout):
 * - registers the device on sign-in when permission is already granted
 *   (the contextual first prompt lives in useNotificationPermission);
 * - tap deep-linking: navigates to notification.data.url (FR-011/FR-012),
 *   including the cold-start case via getLastNotificationResponseAsync;
 * - replays queued token registrations / deactivations when the device
 *   comes back online (offline retry, FR-014 edge case).
 * (Foreground suppression is configured once at module scope in
 * src/app/_layout.tsx — FR-016.)
 */
export function useNotificationSetup(): void {
  const router = useRouter();
  const { user } = useAuth();
  const { isConnected } = useNetworkStatus();
  const wasOffline = useRef(false);

  // Tap deep-linking (warm start).
  useEffect(() => {
    const handleTap = (notification: AppNotification) => {
      const url = notification.data?.url;
      if (typeof url === 'string' && url.startsWith('/(')) {
        router.push(url as never);
      }
    };
    const unsubscribe = notificationService.onNotificationTapped(handleTap);
    return unsubscribe;
  }, [router]);

  // Cold start: a notification tap that launched the app.
  useEffect(() => {
    ExpoNotifications.getLastNotificationResponseAsync().then((response) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/(')) {
        router.replace(url as never);
      }
    });
  }, [router]);

  // Offline retry: when connectivity returns after a drop, replay queued
  // token registration / deactivation intents.
  useEffect(() => {
    if (isConnected && wasOffline.current) {
      notificationService.retryPending().catch(() => {
        // stays queued; retried on the next restoration
      });
    }
    wasOffline.current = !isConnected;
  }, [isConnected]);

  // Register whenever a signed-in user changes and permission is already
  // granted (the contextual first prompt lives in useNotificationPermission;
  // re-granted users simply re-register on sign-in).
  useEffect(() => {
    if (!user) return;
    notificationService
      .getPermissionStatus()
      .then((status) => {
        if (status === 'granted') {
          return notificationService.registerDevice(user.id).catch(() => {
            // queued by the service; retried on next network restoration
          });
        }
        return undefined;
      })
      .catch(() => undefined);
  }, [user]);
}
