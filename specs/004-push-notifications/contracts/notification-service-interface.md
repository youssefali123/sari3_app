# Contract: NotificationService Interface

**Feature Branch**: `004-push-notifications`
**Date**: 2026-09-22

## Overview

The `NotificationService` domain interface (Constitution Principle VIII) defines the client-side push notification contract. The existing interface at `src/features/notifications/domain/services/NotificationService.ts` will be extended to support the full feature requirements.

## Current Interface

```typescript
export interface NotificationService {
  registerDevice(userId: string): Promise<void>;
  requestPermission(): Promise<boolean>;
  onNotificationReceived(callback: (notification: AppNotification) => void): Unsubscribe;
  onNotificationTapped(callback: (notification: AppNotification) => void): Unsubscribe;
}
```

## Extended Interface

```typescript
export interface AppNotification {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationService {
  /** Request notification permission from the user. Returns true if granted. */
  requestPermission(): Promise<boolean>;

  /** Check current permission status without prompting. */
  getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'>;

  /**
   * Register the device for push notifications and store the token server-side.
   * Performs upsert — safe to call multiple times for the same device.
   * Captures the device OS locale and sends it with the upsert (server reads
   * the stored locale per token at dispatch; see research R-003).
   * If the network call fails, queues the registration for retry.
   */
  registerDevice(userId: string): Promise<void>;

  /**
   * Deactivate the current device's push token on the server.
   * Called during the sign-out sequence (FR-005).
   * If offline, queues deactivation for next network contact.
   */
  deactivateDevice(): Promise<void>;

  /** Listen for notifications received while the app is foregrounded. */
  onNotificationReceived(callback: (notification: AppNotification) => void): Unsubscribe;

  /** Listen for when the user taps on a notification. */
  onNotificationTapped(callback: (notification: AppNotification) => void): Unsubscribe;
}
```

## Changes from Current Interface

| Change | Reason |
|--------|--------|
| Added `getPermissionStatus()` | Needed to check status before prompting (FR-013 — prompt only at high-intent moments) |
| Added `deactivateDevice()` | Required by FR-005 — token deactivation on sign-out |
| Updated `registerDevice()` docs | Clarifies upsert behavior and offline retry (FR-001, edge case) |

## Infrastructure Implementation

The `ExpoNotificationService` implements `NotificationService` using:

- `expo-notifications` SDK v57 for token retrieval and event listeners
- Supabase client for `device_push_tokens` table upsert/deactivation
- AsyncStorage for retry queue and permission prompt tracking

## Integration Points

| Consumer | Method | Trigger |
|----------|--------|---------|
| Checkout flow (post-order) | `requestPermission()` + `registerDevice()` | After first successful order placement (customer) |
| Driver availability toggle | `requestPermission()` + `registerDevice()` | After first toggle to Available (driver) |
| Sign-out sequence | `deactivateDevice()` | Before/during `authRepository.logout()` |
| Root layout (`_layout.tsx`) | `onNotificationTapped()` | App startup — deep link handler |
| Root layout (`_layout.tsx`) | Foreground handler setup | App startup — suppression via `setNotificationHandler` |

## Dependency Direction Compliance (Principle III)

```
Presentation → Application → Domain ← Infrastructure
                              ↑
                    NotificationService interface
                              ↑
                    ExpoNotificationService (infra)
```

The domain interface (`NotificationService`) has zero dependencies on Expo, Supabase, or React Native. The infrastructure implementation (`ExpoNotificationService`) imports from `expo-notifications` and `@supabase/supabase-js`.
