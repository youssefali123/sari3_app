/**
 * Client-side representation of a device push token registration
 * (server table: `device_push_tokens`; upsert key: pushToken).
 */
export interface DevicePushRegistration {
  id: string;
  userId: string;
  pushToken: string;
  platform: 'ios' | 'android';
  locale: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
