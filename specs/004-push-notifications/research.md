# Research: Push Notifications

**Feature Branch**: `004-push-notifications`
**Date**: 2026-09-22
**Spec**: [spec.md](./spec.md)

## Research Tasks

### R-001: Expo Notifications SDK v57 — Token Registration & Permission Flow

**Context**: The feature requires client-side push token registration, permission prompting at high-intent moments, and foreground notification suppression.

**Decision**: Use `expo-notifications` v57 SDK as the client-side notification library.

**Rationale**:
- Constitution mandates Expo Notifications as the push notification technology (Technology Stack table).
- `expo-notifications` provides all necessary APIs: `getExpoPushTokenAsync()` for Expo push tokens, `requestPermissionsAsync()` / `getPermissionsAsync()` for permission management, `setNotificationHandler()` for foreground suppression, and `addNotificationResponseReceivedListener()` for tap deep-linking.
- Expo Push Token (via `getExpoPushTokenAsync({ projectId })`) abstracts over FCM/APNs, providing a single token format that works with the Expo Push Service on the server.

**Alternatives Considered**:
- **Native FCM/APNs tokens via `getDevicePushTokenAsync()`**: Would require server-side logic to differentiate iOS/Android token formats and send to each provider separately. Expo Push Token abstracts this. Rejected for unnecessary complexity.
- **Third-party services (OneSignal, Firebase Cloud Messaging directly)**: Constitution's Technology Stack binds the project to Expo Notifications. Rejected per constitutional compliance.

**Key API Surface (Expo SDK v57)**:
- `Notifications.getExpoPushTokenAsync({ projectId })` → Returns `ExpoPushToken` with `.data` string (the token to store server-side).
- `Notifications.getPermissionsAsync()` → Returns `{ status: 'granted' | 'denied' | 'undetermined' }`.
- `Notifications.requestPermissionsAsync()` → Prompts the OS permission dialog.
- `Notifications.setNotificationHandler({ handleNotification })` → Controls foreground notification display. Return `{ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }` to suppress.
- `Notifications.addNotificationResponseReceivedListener(callback)` → Fires when user taps a notification. `response.notification.request.content.data` carries the deep-link payload.
- `Notifications.getLastNotificationResponseAsync()` → For cold-start deep linking.
- `Notifications.setNotificationChannelAsync(channelId, config)` → Required on Android 13+ before requesting permissions.

---

### R-002: Server-Side Notification Dispatch via Supabase Database Triggers

**Context**: FR-015 requires all notifications to originate from server-side database state transitions. The spec mandates dispatch within 3 seconds (SC-001). The project uses Supabase (Postgres + Edge Functions).

**Decision**: Use a Postgres `AFTER INSERT OR UPDATE` trigger on the `orders` table that writes one durable row per status transition into `notification_events` — the trigger performs NO external HTTP. A Supabase Database Webhook on `notification_events` INSERTs invokes the Edge Function asynchronously, outside the order transaction.

**Rationale**:
- Postgres triggers fire on committed state transitions — this guarantees FR-015 (server-authoritative triggering).
- The trigger's only responsibility is creating the durable enqueue record. No HTTP happens inside (or because of) the order transaction, so order writes can never be slowed or failed by notification delivery.
- Supabase Database Webhooks (verified against current docs: an async `pg_net`-based wrapper firing after the row change, non-blocking) invoke the Edge Function outside the order transaction.
- A Supabase Edge Function invoked via the webhook handles event claiming (see R-004 idempotency), Expo Push API calls, per-device locale resolution, and message composition.

**Trigger contract (must mirror `emit_driver_pool_signal` predicates from 003 — neither duplicated nor reinterpreted)**:

| Operation | Predicate | Push consequence (exactly one event row each) |
|---|---|---|
| `INSERT` with `NEW.status = 'pending'` | new order | one `new_order_pool` row |
| `UPDATE` `OLD.status IN ('accepted','preparing','out_for_delivery')` → `NEW.status = 'pending'` | `release_order` reverted to pending | one `order_released` row (customer) **and** one `new_order_pool` row (drivers) |
| `UPDATE` to `accepted` / `preparing` / `out_for_delivery` / `delivered` / `cancelled` | lifecycle advance | one corresponding `order_*` row (customer) |

Per-transition identity is `orders.event_seq` (new `INTEGER NOT NULL DEFAULT 0` column, bumped by a `BEFORE UPDATE` trigger — atomic via row lock, race-free unlike `COUNT(*)`; verified compatible with 003's `orders_column_guard`, which does not inspect the new column). The AFTER trigger inserts with `dedupe_key = order_id:event_type:event_seq` and `ON CONFLICT (dedupe_key) DO NOTHING`. Full mechanism in data-model.md Idempotency.

**Mandatory trigger hygiene**:
- The trigger MUST carry `WHEN (OLD.status IS DISTINCT FROM NEW.status)` (or equivalent in-function guard) so non-status touches (e.g. `updated_at`) never write event rows.
- The Database Webhook's Authorization header (Edge Function bearer secret) is configured on the webhook itself — never in trigger SQL, never in client code. Prefer a Supabase Vault-backed secret reference where supported.
- Any new RPC created by this feature MUST follow the 003 secret/grant discipline: `REVOKE ... FROM PUBLIC` + `REVOKE ... FROM anon`, `GRANT` only to `authenticated, service_role`.

**Alternatives Considered**:
- **Client-side notification triggering**: Explicitly prohibited by FR-015 and the spec edge cases. Rejected.
- **Polling-based approach (cron job checking for changes)**: Introduces latency (violates SC-001's 3-second requirement) and adds complexity. Rejected.
- **Supabase Realtime + Edge Function listener**: Realtime channels are for client subscriptions; using them server-side adds an unnecessary hop. Rejected.

**Architecture**:
1. `orders` table `BEFORE UPDATE` trigger bumps `NEW.event_seq` (row-lock serialized, race-free).
2. `orders` table `AFTER INSERT OR UPDATE` trigger (guarded by `OLD.status IS DISTINCT FROM NEW.status` on updates) detects status column changes and INSERTs exactly one `notification_events` row per transition (`dispatch_status='pending'`, `dedupe_key` from `NEW.event_seq`, `ON CONFLICT DO NOTHING`). No HTTP here, no Expo calls here.
3. A Supabase Database Webhook on `notification_events` INSERTs POSTs the new row (event id) to the notification Edge Function endpoint — async, outside the order transaction.
4. Edge Function atomically claims the row via the Supabase client (`update({dispatch_status:'processing'}).eq('id',eventId).eq('dispatch_status','pending').select()` — single statement; only the invocation returning 1 row proceeds), resolves notification targets server-side at dispatch time (customer → active tokens; pool → eligible drivers per R-005), composes locale-aware messages, and calls the Expo Push API (`https://exp.host/--/api/v2/push/send`), then marks the row `sent`/`failed`. No helper RPC, no queue system.
5. A release (`active → pending`) produces TWO event rows from one trigger fire: `order_released` (customer) and `new_order_pool` (eligible drivers). A later second release is a new transition (new `event_seq`) producing new rows — releases are never collapsed into one lifetime event.
6. Edge Function handles token validation responses from Expo API — marks tokens as inactive when Expo reports `DeviceNotRegistered`.

---

### R-003: Push Token Storage — Supabase Table Design

**Context**: FR-001 through FR-006 require a device push registration table with upsert-by-token-string, multi-device support, and sign-out deactivation.

**Decision**: Create a `device_push_tokens` table in Supabase with the push token string as the unique constraint for upsert behavior.

**Rationale**:
- The spec explicitly defines the uniqueness rule: "the push token string is the unique key" (Key Entities section).
- An upsert on the token column handles FR-001's requirement: re-registration updates the existing row rather than creating a duplicate.
- Multi-device support (FR-003) is naturally satisfied since each device has a distinct push token, resulting in separate rows for the same user.

**Schema Decision**:
```sql
CREATE TABLE device_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  locale TEXT NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_device_push_tokens_user_id ON device_push_tokens(user_id);
CREATE INDEX idx_device_push_tokens_active ON device_push_tokens(user_id, is_active) WHERE is_active = true;
```

**Locale writer**: The `locale` column is populated by the **client** from the device OS locale at registration time (`registerDevice` reads `Localization.getLocales()` / equivalent and sends it with the upsert). The server never guesses locale — it reads the stored value per token at dispatch.

**RLS Policies**:
- Users can INSERT/UPDATE their own token rows (`auth.uid() = user_id`).
- Users can SELECT their own rows (for client-side deactivation on sign-out).
- Service role (Edge Function) can SELECT all active tokens for dispatch.

---

### R-004: Notification Event Logging Table

**Context**: The spec defines a `Notification Event` entity for tracking dispatched notifications.

**Decision**: Create a `notification_events` table to log each dispatched notification for auditability and debugging.

**Rationale**:
- Provides an audit trail for debugging delivery issues.
- Enables future analytics on notification delivery rates.
- The spec's Key Entities section explicitly defines this entity.

**Schema Decision**:
```sql
CREATE TABLE notification_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'new_order_pool', 'order_accepted', 'order_preparing',
    'order_out_for_delivery', 'order_delivered', 'order_cancelled',
    'order_released'
  )),
  order_id UUID NOT NULL REFERENCES orders(id),
  target_role TEXT NOT NULL CHECK (target_role IN ('customer', 'driver')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link_url TEXT NOT NULL,
  dispatch_status TEXT NOT NULL DEFAULT 'pending' CHECK (dispatch_status IN ('pending', 'processing', 'sent', 'failed')),
  dedupe_key TEXT NOT NULL UNIQUE,
  expo_receipts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_events_order ON notification_events(order_id);
```

**Idempotency**: see data-model.md — `dedupe_key = order_id:event_type:event_seq` (UNIQUE; `event_seq` bumped by a row-lock-serialized `BEFORE UPDATE` trigger on `orders`, never `COUNT(*)`; required because releases and post-release re-accepts make every non-terminal event type legitimately repeatable) plus atomic client-API claim (`pending` → `processing`, row-count check) before any Expo Push API call, so webhook redelivery is safe. No `target_user_ids` column: recipients are resolved at dispatch time, so a stored list would be stale by construction.

**Retention**: Append-only with no pruning job in MVP. Retention policy is explicitly deferred — revisit as a follow-up once volume data exists.

---

### R-005: Expo Push API — Best Practices for Server-Side Sending

**Context**: The server (Edge Function) must call the Expo Push API to deliver notifications.

**Decision**: Use the Expo Push API v2 directly via HTTP from the Supabase Edge Function.

**Rationale**:
- The Expo Push API endpoint (`https://exp.host/--/api/v2/push/send`) accepts batches of up to 100 messages per request.
- Supports locale-aware payloads via the `body` and `title` fields.
- Returns ticket IDs that can be used to check receipts for delivery status.
- `DeviceNotRegistered` error in receipts signals stale tokens (FR-017).

**Key Implementation Details**:
- **Batching**: Group messages by 100 tokens per API call.
- **Token pruning**: When Expo receipt reports `DeviceNotRegistered`, set `is_active = false` on the token row (FR-017).
- **No retry logic**: FR-018 explicitly prohibits custom retry/persistence logic. Rely on OS-level provider queuing.
- **Locale resolution**: The Edge Function reads `locale` from the `device_push_tokens` row to compose messages in the correct language.
- **Driver privacy**: For `new_order_pool` events, the message body includes only pickup zone and order value (FR-010), never customer PII.
- **Driver targeting (must mirror `get_available_orders()` pool semantics)**: a driver receives `new_order_pool` pushes IFF all four hold — `profiles.role = 'driver'`, `driver_profiles.is_available = true`, no active delivery held, AND an active push token. Reference predicate:
  ```sql
  SELECT t.push_token, t.locale
    FROM device_push_tokens t
    JOIN profiles p ON p.id = t.user_id AND p.role = 'driver'
    JOIN driver_profiles d ON d.user_id = t.user_id AND d.is_available = true
   WHERE t.is_active = true
     AND NOT EXISTS (
       SELECT 1 FROM orders o
        WHERE o.driver_id = t.user_id
          AND o.status IN ('accepted', 'preparing', 'out_for_delivery')
     );
  ```
  Without the `NOT EXISTS` clause, drivers mid-delivery receive pool pushes for orders they are forbidden to accept (notification fatigue / uninstall bait).
- **SC-001 caveat**: Edge Function cold starts on the free tier can occasionally push dispatch past the 3-second target. Acceptable for MVP; set expectations accordingly rather than engineering warm-up infrastructure.

---

### R-006: Deep Linking via Expo Router

**Context**: FR-011 and FR-012 require tapping notifications to deep-link to specific screens.

**Decision**: Use Expo Router's built-in URL-based deep linking with a `url` field in the notification `data` payload.

**Rationale**:
- Expo Router v57 supports URL-based navigation out of the box. The project already uses Expo Router (file-based routing).
- The Expo Notifications docs (v57) show the exact pattern: listen with `addNotificationResponseReceivedListener` and call `router.push(url)` with the `data.url` field.
- For cold-start, use `Notifications.getLastNotificationResponseAsync()` to catch the initial notification.

**Deep Link URL Patterns**:
- Customer order detail: `/(customer)/orders/{orderId}` → maps to `src/app/(customer)/orders/[id].tsx`
- Driver available pool: `/(driver)/available-orders` → maps to `src/app/(driver)/available-orders/index.tsx`

---

### R-007: Foreground Notification Suppression

**Context**: FR-016 requires complete suppression of OS notification banners when the app is in the foreground. No in-app toast either.

**Decision**: Use `Notifications.setNotificationHandler()` with all display flags set to `false`.

**Rationale**:
- `setNotificationHandler` is called once at app startup (module scope).
- Returning `{ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }` from `handleNotification` suppresses all foreground notification UI.
- The existing real-time subscriptions (via Supabase Realtime) already update in-app screens in real time — no additional UI is needed.
- This satisfies both the customer scenario (order detail screen updates via realtime) and the driver scenario (available orders pool updates via realtime).

---

### R-008: Token Registration Retry on Network Failure

**Context**: The edge case spec requires that if token registration fails due to network issues, it must be retried upon network restoration without failing the sign-in flow.

**Decision**: Implement a simple retry mechanism using `expo-network` (already used via `useNetworkStatus` hook in the driver feature) and AsyncStorage for queuing.

**Rationale**:
- If `getExpoPushTokenAsync()` or the Supabase upsert call fails, persist the intent in AsyncStorage.
- On next app foreground or network restoration (detected via the existing `useNetworkStatus` pattern), retry the registration.
- The sign-in flow proceeds regardless — token registration failure is never a blocker (FR-014 mandates non-blocking behavior).

**Alternatives Considered**:
- **No retry, rely on next app open**: Simpler but may leave users without notifications for extended periods if they don't fully restart the app. Rejected for degraded UX.
- **Background task retry**: Over-engineered for an MVP. A foreground check on app resume is sufficient. Rejected per Principle X.

---

### R-009: Sign-Out Token Deactivation with Offline Handling

**Context**: FR-005/FR-006 require token deactivation on sign-out. Edge case requires handling offline sign-out.

**Decision**: Deactivate token server-side during sign-out; if offline, clear local state immediately and queue server-side deactivation for next network contact.

**Rationale**:
- On sign-out, call a Supabase RPC or direct update to set `is_active = false` for the current device's token.
- The current device's push token is stored in memory (or AsyncStorage) to identify which row to deactivate.
- If the device is offline during sign-out, clear the local push token immediately (so no local state references the old user), and on next app launch or network restoration, deactivate the server-side record.

---

### R-010: Contextual Permission Prompting Strategy

**Context**: FR-013 specifies exact trigger moments for permission prompts — after first order placement (customer) and after first Available toggle (driver).

**Decision**: Track "has prompted" state via AsyncStorage flags, check + prompt at the exact trigger points in the application layer.

**Rationale**:
- A `notification_permission_prompted` flag in AsyncStorage (per device) prevents re-prompting on subsequent orders/toggles.
- For customers: Hook into the `placeOrder` success callback in checkout flow to check the flag and prompt.
- For drivers: Hook into the `toggleAvailability(true)` success callback in the driver availability toggle to check the flag and prompt.
- If permission is granted, proceed to register the push token immediately.
- If denied, the app continues fully functional (FR-014).

**Alternatives Considered**:
- **Prompt on app launch**: Explicitly prohibited by FR-013. Rejected.
- **Prompt on every order/toggle**: FR-013 says "first" — must be gated by a flag. Rejected.

---

### R-011: EAS Development-Build Pipeline & Push Credentials (Android-First)

**Context**: Push cannot be tested in Expo Go on Android (SDK 53+ removed support), and this repo has no `eas.json` or dev-client setup. Android requires a Firebase project + FCM credentials uploaded to Expo; iOS requires a paid Apple Developer account + APNs key + a physical iPhone. Without this pipeline, no quickstart scenario is runnable.

**Decision**: Scope 004 validation Android-first and make the EAS pipeline an explicit Phase 0 prerequisite task (blocking all validation tasks).

**Rationale**:
- Android path is fully achievable without paid accounts (Firebase is free; any physical Android device works).
- iOS validation is deferred until Apple Developer + APNs credentials exist — a conscious scoping decision, not an oversight.
- Surfacing this as a blocking task prevents discovering at implementation time that the quickstart cannot run.

**Prerequisite task (must complete before any validation)**:
1. Create `eas.json` with a `development` profile (dev-client enabled).
2. Set EAS project ID in `app.json` / `app.config.js`.
3. Create Firebase project, add Android app, generate FCM server key; upload via `eas credentials`.
4. Run `eas build --profile development --platform android` and install on a physical device.

## Summary

All NEEDS CLARIFICATION items have been resolved. The research confirms:
1. **Client SDK**: Expo Notifications v57 with Expo Push Tokens.
2. **Server trigger**: Postgres `AFTER INSERT OR UPDATE` trigger (status-change guarded) writes durable `notification_events` rows — no HTTP in the order path; Database Webhook (async, post-row-change) → Edge Function → Expo Push API. Webhook secret lives on the webhook config; 003 grant discipline on new RPCs.
3. **Storage**: `device_push_tokens` table with upsert-by-token-string uniqueness; locale written by the client at registration.
4. **Logging**: `notification_events` table for audit trail (7 event types; append-only, no MVP retention job).
5. **Deep linking**: Expo Router URL-based navigation via notification `data.url`.
6. **Foreground suppression**: `setNotificationHandler` with all flags false.
7. **Resilience**: AsyncStorage-based retry for offline token registration; queued deactivation for offline sign-out.
8. **Permission timing**: AsyncStorage flag-gated prompts at first order (customer) or first Available toggle (driver).
9. **Release handling**: `active → pending` UPDATE fires both `order_released` (customer) and `new_order_pool` (eligible drivers).
10. **Driver targeting**: mirrors `get_available_orders()` — role + Available + no active delivery + active token.
11. **Validation**: Android-first EAS dev-build pipeline is a blocking Phase 0 prerequisite.
