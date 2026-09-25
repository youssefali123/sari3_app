# Implementation Plan: Push Notifications

**Branch**: `004-push-notifications` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-push-notifications/spec.md`

## Summary

Server-authoritative push notifications for the Sari3 delivery app. Customers receive distinct, human-readable, locale-aware (Arabic/English) push notifications for each order lifecycle milestone (accepted, preparing, out_for_delivery, delivered, cancelled, released). Available drivers with no active delivery receive push alerts for new unclaimed orders, including released orders re-entering the pool. The server pipeline is durable and asynchronous: a Postgres trigger on `orders` writes one row per status transition into `notification_events` (no HTTP inside the order transaction); a Supabase Database Webhook on that table's INSERTs invokes the `notify-order-status` Edge Function outside the order transaction; the function claims the event row, resolves targets, and dispatches via the Expo Push API. Client-side uses `expo-notifications` v57 for token registration, contextual permission prompting, foreground suppression, and deep-link navigation via Expo Router.

```text
Order state change
    ↓
Postgres trigger (status-change guarded; writes ONLY a notification_events row)
    ↓
INSERT into notification_events (durable enqueue record, dispatch_status='pending')
    ↓
Supabase Database Webhook on notification_events INSERT (async, outside order txn)
    ↓
Supabase Edge Function notify-order-status (claims row → resolves targets → sends)
    ↓
Expo Push API
    ↓
Target devices
```

## Technical Context

**Language/Version**: TypeScript (strict mode), Expo SDK 57

**Primary Dependencies**: React Native, Expo Router, expo-notifications v57, @supabase/supabase-js, TanStack Query v5, Redux Toolkit, AsyncStorage

**Storage**: Supabase (Postgres) — new tables: `device_push_tokens`, `notification_events` (durable outbox: trigger-written, webhook-consumed; see [data-model.md](./data-model.md)); existing: `orders`, `driver_profiles`, `profiles`. Database Webhook on `notification_events` INSERT → `notify-order-status` Edge Function (verified against current Supabase docs: webhooks are an async pg_net-based wrapper firing after row change, non-blocking).

**Testing**: Manual validation via EAS development build on a physical Android device first (Android-first scope: push cannot be tested in Expo Go on Android since SDK 53+, and this repo has no `eas.json` or dev-client setup — see Phase 0 prerequisite below). Supabase SQL for database-level verification. See [quickstart.md](./quickstart.md).

**Target Platform**: Android-first for validation (physical device + EAS dev build); iOS follows once Apple Developer + APNs credentials exist.

**Phase 0 Prerequisite (blocking)**: EAS dev-build pipeline must exist before any validation task — create `eas.json` (development profile), configure EAS project ID in `app.json`, provision Firebase/FCM credentials for Android via `eas credentials`, and produce one installable Android dev build. No quickstart scenario is runnable without this.

**Project Type**: Mobile app (React Native + Expo)

**Performance Goals**: Notification dispatch within 3 seconds of database state change (SC-001). Deep-link navigation under 2 seconds from cold/warm launch (SC-004).

**Constraints**: No in-app toast/banner on foreground (FR-016). No server-side retry logic (FR-018). No client-side notification triggering (FR-015). Bilingual minimum: Arabic + English (FR-010).

**Scale/Scope**: Multi-device per user (uncapped). All eligible available drivers notified per new order (no batching/throttling). 7 notification event types. `notification_events` is append-only with no retention job in MVP (revisit retention as a follow-up, not in this feature).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-First Structure | ✅ PASS | All new code under `src/features/notifications/`. No cross-cutting directories. |
| II. Lightweight Clean Architecture | ✅ PASS | Domain: entities + `NotificationService` interface. Infrastructure: `ExpoNotificationService`. Application: hooks (`useNotificationSetup`, permission prompt logic). Presentation: none needed (notifications are headless). |
| III. Dependency Direction | ✅ PASS | Domain `NotificationService` interface has zero framework dependencies. Infrastructure implements it using `expo-notifications` + Supabase. |
| IV. State Ownership | ✅ PASS | Push token registration state is server-authoritative (Supabase table). Local `hasPrompted` flag in AsyncStorage is device-local transient state. No new Redux slices. No TanStack Query misuse. |
| V. Server Is Final Authority | ✅ PASS | FR-015 mandates all notifications originate from server-side DB triggers. Client never triggers push to other users. |
| VI. Atomic Writes | ✅ PASS | Token upsert uses Postgres `ON CONFLICT` (atomic). Order status transitions already use hardened RPCs. |
| VII. Immutable Snapshots | ✅ N/A | No historical records affected. Notification events are append-only logs. |
| VIII. Realtime vs Push Separation | ✅ PASS | Push notifications hidden behind domain `NotificationService` interface. Realtime updates remain on separate `OrderRealtimeService` / `DriverRealtimeService`. No coupling between the two. |
| IX. Deferred Scope | ✅ PASS | Architecture supports future notification channels (SMS, email) via additional `NotificationService` implementations. No structural lock-in. |
| X. Practical MVP Simplicity | ✅ PASS | No DI container. No polymorphic patterns. Direct AsyncStorage flag for prompt tracking. Minimal new files. |

**Post-Phase 1 Re-check**: All principles remain satisfied. The `deactivateDevice()` addition to `NotificationService` follows the existing interface pattern. The Edge Function is a standalone server-side component with no client coupling.

**Revision Re-check (missing.txt review, 2026-09-22)**: Release handling (`order_released` + pool re-push) stays server-authoritative (V ✅) and reuses 003's atomic `release_order` RPC (VI ✅). Eligible-driver targeting is a read-only predicate mirroring `get_available_orders()` — no new state stores (IV ✅). Vault-held secret + 003 grant discipline preserve the security posture (V ✅). No new abstractions; per-order fan-out with no coalescing infra (X ✅). No gate violations.

**Revision Re-check (edit-plan-4, 2026-09-22)**: Trigger→events→webhook→function keeps V ✅ (trigger writes durable rows from verified transitions; function re-reads server-side, never trusts payload). Claim-before-send + `dedupe_key` UNIQUE keep VI ✅ (atomic claim UPDATE; DB-enforced invariant, no client locks). Push stays behind `NotificationService`, realtime untouched ✅ (VIII). No broker/queue/DI; webhook is managed Supabase infra, not a new abstraction ✅ (X). RLS enabled on both tables with zero client access to the event log and own-rows-only token access — no weakening for the pipeline ✅ (V). No gate violations.

**Revision Re-check (fix-tasks4, 2026-09-22)**: `orders.event_seq` (row-lock-serialized BEFORE trigger; verified compatible with 003's `orders_column_guard`, which does not inspect the new column) replaces the race-prone `COUNT(*)` ordinal — VI ✅ (DB serializes identity; UNIQUE + ON CONFLICT enforce it). `target_user_ids` removed (dispatch-time resolution; no stale lists) — X ✅ (less schema, no post-send UPDATE). Claim expressed as an executable Supabase-client update+select row-count check, no helper RPC — X ✅. Eligibility re-verified against actual 003 columns (`profiles.role`, `driver_profiles.is_available`/`user_id`, `orders.driver_id`/`status`) — V ✅ (no reinterpreted business rules; `claim_order()` untouched). Token access stays TanStack-free direct Supabase calls for fire-and-forget registration with no cached/shared state — IV ✅ (server table remains the single source of truth; no Redux, no duplicated stores). Snapshots unaffected (events are new logs, not transaction records) — VII N/A ✅. No GPS/payments/Admin/inbox/retry-queues added — IX ✅. No gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-push-notifications/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── supabase-edge-function.md
│   └── notification-service-interface.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/features/notifications/
├── domain/
│   ├── entities/
│   │   ├── DevicePushRegistration.ts     # New: push token domain entity
│   │   └── NotificationEventType.ts      # New: event type enum
│   └── services/
│       └── NotificationService.ts        # Modified: add deactivateDevice(), getPermissionStatus()
├── application/
│   └── hooks/
│       ├── useNotificationSetup.ts       # New: foreground handler + deep-link listener
│       └── useNotificationPermission.ts  # New: contextual permission prompt logic
└── infrastructure/
    └── ExpoNotificationService.ts        # New: expo-notifications implementation

supabase/
├── migrations/
│   ├── YYYYMMDD_create_device_push_tokens.sql
│   ├── YYYYMMDD_create_notification_events.sql   # dedupe_key UNIQUE (event_seq-sourced), claim statuses, no client policies
│   └── YYYYMMDD_create_order_notification_trigger.sql  # ADD COLUMN orders.event_seq + BEFORE seq trigger + WHEN-guarded rows-only AFTER trigger; webhook on notification_events INSERT created here or via dashboard
└── functions/
    └── notify-order-status/
        └── index.ts                      # Edge Function: claim event row → resolve targets → Expo Push API
```

**Structure Decision**: Feature-first under `src/features/notifications/` following the existing pattern. Server-side components under `supabase/` directory. No new top-level directories needed. The feature adds the Application layer (hooks) that was previously absent in the notifications feature scaffold.

## Privilege Boundary

| Layer | Credentials held | Postgres access | May do |
|---|---|---|---|
| React Native client | User JWT only (`authenticated` role). NEVER `service_role`, webhook secrets, or Vault access | RLS-enforced: own `device_push_tokens` rows only; zero access to `notification_events` | Register/deactivate own token; read own rows |
| Postgres trigger (`SECURITY DEFINER`) | None (runs inside DB) | Writes `notification_events` rows; reads `orders` transition | Enqueue exactly one event row per genuine status transition; no HTTP |
| Database Webhook | Webhook-configured Authorization header only | None directly (receives row payload) | POST new event rows to the Edge Function, async |
| Edge Function | `service_role` (server env only) | Bypasses RLS: claims event rows, reads eligible tokens + order context, prunes dead tokens | Claim → resolve → send via Expo Push API |
| Expo Push API | Expo credentials (server env only) | None | Deliver to devices; report `DeviceNotRegistered` receipts |

## Complexity Tracking

> No constitution violations detected. This section is intentionally empty.
