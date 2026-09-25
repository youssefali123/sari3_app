# Data Model: Push Notifications

**Feature Branch**: `004-push-notifications`
**Date**: 2026-09-22
**Spec**: [spec.md](./spec.md)

## New Entities

### DevicePushToken

**Table**: `device_push_tokens`

**Purpose**: Represents an active association between a user account, a physical client device, and its push notification token. Supports multi-device registration per user.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Primary key |
| `user_id` | `UUID` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | The authenticated user this token belongs to |
| `push_token` | `TEXT` | NOT NULL, UNIQUE | The Expo Push Token string (e.g. `ExponentPushToken[xxx]`). Unique key for upsert. |
| `platform` | `TEXT` | NOT NULL, CHECK IN (`'ios'`, `'android'`) | Device platform |
| `locale` | `TEXT` | NOT NULL, DEFAULT `'en'` | Device OS locale for localized notification content (Arabic/English minimum per FR-010) |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT `true` | Whether this token is currently active. Set to `false` on sign-out or when Expo reports `DeviceNotRegistered`. |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Last update timestamp |

**Indexes**:
- `idx_device_push_tokens_user_id` on `(user_id)` — for looking up all tokens for a user during notification dispatch.
- `idx_device_push_tokens_active` on `(user_id, is_active) WHERE is_active = true` — partial index for efficient active-token lookups.

**Uniqueness Rule**: The `push_token` column is the unique key. An upsert on `push_token` handles FR-001: if the exact token already exists, the `user_id`, `is_active`, `locale`, and `updated_at` fields are updated in place rather than creating a duplicate row.

**Validation Rules**:
- `push_token` must be a non-empty string.
- `platform` must be exactly `'ios'` or `'android'`.
- `locale` must be a valid BCP-47 language tag (validated at the application layer).

**RLS Policies** (`ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY` is mandatory):

| Policy Name | Action | Rule (ownership predicate: `auth.uid() = user_id`) | Purpose |
|-------------|--------|------|---------|
| `users_insert_own_tokens` | INSERT | `auth.uid() = user_id` WITH CHECK | Users can register only their own device tokens |
| `users_update_own_tokens` | UPDATE | `auth.uid() = user_id` (USING + WITH CHECK) | Users can deactivate only their own tokens (sign-out sets `is_active = false`; no DELETE needed) |
| `users_select_own_tokens` | SELECT | `auth.uid() = user_id` | Users can read only their own token records |

Security invariants:
- No policy permits touching another user's rows — insert/update/select of another user's token is denied by default (no permissive policy = no access).
- The client NEVER holds privileged credentials: no `service_role` key, no webhook secret, no Vault access in the React Native app.
- Server-side dispatch reads eligible tokens via the Edge Function's `service_role` client, which bypasses RLS by design. This is the sanctioned privileged path — RLS is not weakened (no broad policies added) to make the function work.

**Locale writer**: `locale` is written by the client from the device OS locale at registration (see research R-003); the server only reads it.

---

### NotificationEvent

**Table**: `notification_events`

**Purpose**: Server-side audit log capturing each order lifecycle change that warranted notification delivery. Used for debugging, monitoring, and future analytics.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | Primary key |
| `event_type` | `TEXT` | NOT NULL, CHECK IN (`'new_order_pool'`, `'order_accepted'`, `'order_preparing'`, `'order_out_for_delivery'`, `'order_delivered'`, `'order_cancelled'`, `'order_released'`) | The type of notification event |
| `order_id` | `UUID` | NOT NULL, FK → `orders(id)` | The order that triggered this notification |
| `target_role` | `TEXT` | NOT NULL, CHECK IN (`'customer'`, `'driver'`) | The role of the notification recipients |
| `title` | `TEXT` | NOT NULL | The composed notification title (in the default locale) |
| `body` | `TEXT` | NOT NULL | The composed notification body (in the default locale) |
| `deep_link_url` | `TEXT` | NOT NULL | The deep link URL sent in the notification data payload |
| `dispatch_status` | `TEXT` | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'processing'`, `'sent'`, `'failed'`) | Current dispatch status (`processing` = claimed by an Edge Function invocation; see Idempotency) |
| `dedupe_key` | `TEXT` | NOT NULL, UNIQUE | Stable per-transition identity `order_id:event_type:event_seq` (see Idempotency; `event_seq` comes from `orders`, never COUNT(*)) |
| `expo_receipts` | `JSONB` | Nullable | Raw receipt data from the Expo Push API for debugging |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT `now()` | Event creation timestamp |

**Indexes**:
- `idx_notification_events_order` on `(order_id)` — for correlating notifications to orders.
- `idx_notification_events_created` on `(created_at)` — for time-based queries and pruning.

### Idempotency (duplicate-notification protection)

**Why `UNIQUE(order_id, event_type)` is wrong**: verified against 003 semantics, lifecycle events recur within one order's life. `release_order` explicitly allows repeat releases (releases are unconstrained in `driver_order_interactions`), and a released order returns to `pending` where it can be re-accepted — so `accepted`, `preparing`, `out_for_delivery`, `new_order_pool`, and `released` can all legitimately fire multiple times per order. Only `cancelled` and `delivered` are terminal. Identity must therefore be per-transition, not per (order, type).

**Why not `COUNT(*)`**: a trigger-computed `1 + count(existing rows)` ordinal is race-prone — two concurrent transactions can read the same count and produce the same key for distinct transitions (false dedupe → lost notification) or interleave unpredictably. Ordinals must come from a source serialized by the database itself.

**Strategy — `orders.event_seq` (minimum DB mechanism, race-free)**:
1. `ALTER TABLE public.orders ADD COLUMN event_seq INTEGER NOT NULL DEFAULT 0` (additive; existing rows backfill to 0; 003 files untouched).
2. A `BEFORE UPDATE` trigger (`orders_event_seq_before_update`) sets `NEW.event_seq := coalesce(OLD.event_seq, 0) + 1` on every update. This is atomic and race-free: concurrent updaters serialize on the row lock, so each committed row version carries a distinct `event_seq`. It is compatible with 003's `orders_column_guard` (verified: the guard enumerates immutable columns and does not inspect `event_seq`, so the bump never raises) and unaffected by the `app.order_maintenance` GUC (separate trigger, always fires).
3. The AFTER notification trigger derives `dedupe_key := NEW.id || ':' || event_type || ':' || NEW.event_seq` and inserts with `ON CONFLICT (dedupe_key) DO NOTHING`. The same logical transition re-executed resolves to the same row version / same `event_seq` / same key → collapsed to one row by the UNIQUE constraint. Distinct transitions (a second release, a re-accept) carry distinct `event_seq` values → distinct keys, each preserved. No client-generated IDs anywhere.
4. **Claim-before-send** — the Edge Function never sends on sight. It atomically claims via the Supabase client (`update({dispatch_status:'processing'}).eq('id',eventId).eq('dispatch_status','pending').select()` — single statement, row-locked; only the invocation returning 1 row proceeds), sends via the Expo Push API, then marks the row `sent` (or `failed`) with receipts. Webhook redelivery carries the same event id, so a repeated invocation finds the row already `processing`/`sent` and sends nothing. No RPC helper, no queue system.

**Guarantee**: retries and repeated webhook deliveries never produce a duplicate push for an already-processed logical event, while legitimately repeated transitions (releases, re-accepts) each dispatch exactly once.

**Why no `target_user_ids` column**: recipients are resolved server-side at dispatch time (customer → active tokens at send; pool → eligible drivers at send). A recipient list stored at enqueue time would be stale by construction, so the column was removed. Audit needs are met by `event_type` + `dispatch_status` + `expo_receipts`.

**RLS Policies**:
- `ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY` is mandatory.
- The mobile application never reads this log, so: NO `SELECT`/`INSERT`/`UPDATE`/`DELETE` policies for `authenticated` or `anon` — client access is denied by default and stays denied.
- All writes (trigger function, `SECURITY DEFINER`) and all reads/writes (Edge Function via `service_role`, which bypasses RLS) use privileged server-side paths. No RLS weakening for the pipeline.

**Retention**: Append-only, no pruning job in MVP (deferred follow-up).

---

## Modified Entities

### Order (existing: `orders` table)

**One additive column required.** The `orders` table already has a `status` column with the correct enum values (`pending`, `accepted`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`, `rejected`). This feature adds `event_seq INTEGER NOT NULL DEFAULT 0` — a per-row transition counter owned exclusively by the database (see Idempotency). No 003 business semantics change.

**New Triggers** (both in this feature's migration; 003 triggers untouched):
- `orders_event_seq_before_update` — a `BEFORE UPDATE` trigger that sets `NEW.event_seq := coalesce(OLD.event_seq, 0) + 1`. Fires on every update (status or otherwise); harmless on non-status touches because no event row is written for those.
- `trigger_order_status_notification` — an `AFTER INSERT OR UPDATE` trigger on `orders`, guarded by `WHEN (OLD.status IS DISTINCT FROM NEW.status)` on updates so non-status touches never fire it. The trigger function writes exactly one `notification_events` row per genuine status transition (`dedupe_key` from `NEW.event_seq`, `ON CONFLICT (dedupe_key) DO NOTHING`) and performs NO HTTP requests and NO Expo API calls — delivery is driven by the Database Webhook on `notification_events` INSERTs. Transition predicates mirror 003's `emit_driver_pool_signal` exactly (`INSERT` + `pending` → `new_order_pool` once; `active → pending` → `order_released` + `new_order_pool`); 003 business rules are neither duplicated nor reinterpreted. Any new RPC follows the 003 grant discipline (`REVOKE FROM PUBLIC, anon`; `GRANT` to `authenticated, service_role` only).

### DriverProfile (existing: `driver_profiles` table)

**No schema changes required.** The `driver_profiles` table already has `is_available` (boolean). The notification dispatch Edge Function queries this table (plus `profiles.role` and active-delivery state) to resolve eligible driver targets when a `new_order_pool` event fires — mirroring `get_available_orders()` semantics (see research R-005).

---

## Domain Entities (TypeScript)

### DevicePushRegistration (new)

**Location**: `src/features/notifications/domain/entities/DevicePushRegistration.ts`

```typescript
/**
 * Client-side representation of a device push token registration.
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
```

### NotificationEventType (new)

**Location**: `src/features/notifications/domain/entities/NotificationEventType.ts`

```typescript
/**
 * Enum of notification event types matching the server-side check constraint.
 */
export enum NotificationEventType {
  NewOrderPool = 'new_order_pool',
  OrderAccepted = 'order_accepted',
  OrderPreparing = 'order_preparing',
  OrderOutForDelivery = 'order_out_for_delivery',
  OrderDelivered = 'order_delivered',
  OrderCancelled = 'order_cancelled',
  OrderReleased = 'order_released',
}
```

---

## State Transitions

### Notification Trigger State Machine

The notification dispatch is driven entirely by order status transitions:

```
Order Status Change               → Notification Event Type      → Target
─────────────────────────────────────────────────────────────────────────────
pending → accepted                → order_accepted               → customer
accepted → preparing              → order_preparing              → customer
preparing → out_for_delivery      → order_out_for_delivery       → customer
out_for_delivery → delivered      → order_delivered               → customer
any → cancelled                   → order_cancelled              → customer
active → pending (release_order)  → order_released               → customer
                                      + new_order_pool           → eligible drivers
(new order with status=pending)   → new_order_pool               → eligible drivers
```

"Eligible drivers" = `profiles.role = 'driver'` AND `driver_profiles.is_available = true` AND no active delivery AND `device_push_tokens.is_active = true` (mirrors `get_available_orders()`; see research R-005). The release predicate (`OLD.status IN ('accepted','preparing','out_for_delivery') AND NEW.status = 'pending'`) mirrors 003's `emit_driver_pool_signal` exactly.

### Push Token Lifecycle

```
┌──────────────┐     Permission granted     ┌───────────────┐
│  No Token    │ ──────────────────────────► │ Active Token  │
│  (unsigned/  │     + register device       │  is_active=T  │
│   denied)    │                             └───────┬───────┘
└──────────────┘                                     │
                                                     │
                              ┌───────────────────────┼───────────────────┐
                              │                       │                   │
                        User signs out          Token rotated       Expo reports
                        (FR-005)               by OS/SDK          DeviceNotRegistered
                              │                       │              (FR-017)
                              ▼                       ▼                   ▼
                      ┌───────────────┐     ┌─────────────────┐  ┌───────────────┐
                      │  Deactivated  │     │  Old deactivated│  │  Pruned       │
                      │  is_active=F  │     │  New registered │  │  is_active=F  │
                      └───────────────┘     └─────────────────┘  └───────────────┘
```

## Relationships

```
auth.users (1) ──────► (N) device_push_tokens
                            - One user can have many active devices

orders (1) ──────────► (N) notification_events
                            - One order can trigger many notification events
                              (one per status transition)

driver_profiles (N) ◄── queried by notification Edge Function
                            - Available drivers resolved at dispatch time
```
