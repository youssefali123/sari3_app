# Tasks: Push Notifications

**Input**: Design documents from `/specs/004-push-notifications/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Tests**: Manual validation via quickstart.md scenarios + SQL verification (no TDD test files requested in spec; RLS enforcement demonstrated via adversarial SQL checks per constitution workflow)

**Organization**: Tasks grouped by user story. Each story is independently implementable and testable after Foundational completes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Exact file paths included in every description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tooling and environment prerequisites — notably the EAS dev-build pipeline, which blocks ALL on-device validation (research R-011)

- [x] T001 Create `eas.json` with a `development` profile (dev-client enabled) and set the EAS project ID in `app.json`
- [x] T002 [P] Create the Firebase project for Android push, add the Android app, and upload the FCM server key via `eas credentials`
- [ ] T003 Build with `eas build --profile development --platform android` and install the dev build on a physical Android device (depends on T001, T002)
- [x] T004 [P] Install the client SDK with `npx expo install expo-notifications` (expo-notifications v57)
- [x] T005 [P] Create the feature folder structure under `src/features/notifications/` (`domain/entities/`, `domain/services/`, `application/hooks/`, `infrastructure/`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server pipeline (tables, trigger, webhook), shared client infrastructure, security verification. MUST complete before ANY user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 [P] Create migration `supabase/migrations/YYYYMMDD_create_device_push_tokens.sql`: `push_token TEXT NOT NULL UNIQUE` (upsert key), `platform TEXT NOT NULL CHECK (platform IN ('ios', 'android'))`, `locale TEXT NOT NULL DEFAULT 'en'`, `is_active BOOLEAN NOT NULL DEFAULT true`, `created_at`/`updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`, partial index on `(user_id, is_active) WHERE is_active = true`; `ENABLE ROW LEVEL SECURITY` + own-rows-only INSERT/UPDATE/SELECT policies on predicate `auth.uid() = user_id` (no DELETE policy; no `service_role` policy — service_role bypasses RLS); 003 grant discipline (`REVOKE FROM PUBLIC, anon`)
- [x] T007 [P] Create migration `supabase/migrations/YYYYMMDD_create_notification_events.sql`: `event_type TEXT NOT NULL CHECK (event_type IN ('new_order_pool', 'order_accepted', 'order_preparing', 'order_out_for_delivery', 'order_delivered', 'order_cancelled', 'order_released'))`, `dedupe_key TEXT NOT NULL UNIQUE` (`order_id:event_type:event_seq`, seq sourced from `orders.event_seq` — never `COUNT(*)`), `dispatch_status TEXT NOT NULL DEFAULT 'pending' CHECK (dispatch_status IN ('pending', 'processing', 'sent', 'failed'))`, `expo_receipts JSONB` (no `target_user_ids` — recipients are resolved at dispatch time); `ENABLE ROW LEVEL SECURITY` with NO policies for `authenticated`/`anon` (client access denied by default); index on `(order_id)` and `(created_at)`
- [x] T008 Create migration `supabase/migrations/YYYYMMDD_create_order_notification_trigger.sql` (depends on the T007 schema contract — author after T007; applied after it in T009): `ALTER TABLE public.orders ADD COLUMN event_seq INTEGER NOT NULL DEFAULT 0` plus two triggers — (1) `BEFORE UPDATE` trigger setting `NEW.event_seq := coalesce(OLD.event_seq, 0) + 1` (row-lock serialized, race-free; verified compatible with 003's `orders_column_guard`, which does not inspect `event_seq`); (2) `AFTER INSERT OR UPDATE` trigger with `WHEN (OLD.status IS DISTINCT FROM NEW.status)` that writes exactly one `notification_events` row per genuine transition with `dedupe_key = order_id:event_type:NEW.event_seq` and `ON CONFLICT (dedupe_key) DO NOTHING` (`INSERT` + `pending` → one `new_order_pool` row; `active → pending` → one `order_released` row + one `new_order_pool` row, mirroring 003 `emit_driver_pool_signal` without reinterpreting it); trigger performs NO HTTP requests, NO Expo API calls — it persists durable event rows only
- [x] T009 Apply all migrations with `supabase db push` and verify tables, CHECK constraints, trigger, and RLS status in the Supabase dashboard (depends on T006, T007, T008)
- [x] T010 Create the Supabase Database Webhook on `notification_events` INSERTs targeting the `notify-order-status` Edge Function URL, with the Authorization bearer header configured on the webhook (dashboard Integrations → Webhooks or equivalent SQL) (depends on T009)
- [x] T011 [P] Create domain entities `src/features/notifications/domain/entities/DevicePushRegistration.ts` (fields: id, userId, pushToken, platform `'ios' | 'android'`, locale, isActive, createdAt, updatedAt) and `src/features/notifications/domain/entities/NotificationEventType.ts` (enum with exactly `new_order_pool`, `order_accepted`, `order_preparing`, `order_out_for_delivery`, `order_delivered`, `order_cancelled`, `order_released`)
- [x] T012 [P] Extend the domain interface in `src/features/notifications/domain/services/NotificationService.ts` per `contracts/notification-service-interface.md`: add `getPermissionStatus()`, add `deactivateDevice()` (offline-queued), document upsert + locale-capture on `registerDevice(userId: string)`
- [x] T013 Implement `src/features/notifications/infrastructure/ExpoNotificationService.ts` implementing `NotificationService` with `expo-notifications` v57 (`getExpoPushTokenAsync({ projectId })`, permission APIs, response listeners), Supabase `device_push_tokens` upsert/deactivation, device-locale capture on register, AsyncStorage retry queue (depends on T012)
- [x] T014 Run adversarial RLS verification SQL: as User A attempt INSERT/UPDATE/SELECT on User B's `device_push_tokens` row (must fail), as `anon` attempt any access (must fail), as `authenticated` attempt SELECT on `notification_events` (must fail); confirm Edge Function `service_role` path reads/writes succeed (depends on T009)

**Checkpoint**: Foundation ready — durable event pipeline, webhook, and client infra exist; user stories can now begin

---

## Phase 3: User Story 3 — Device Push Token Registration & Multi-Device Support (Priority: P1)

**Goal**: Authenticated users register their device token server-side (upsert, multi-device) with offline retry.

**Independent Test**: Sign in on Device A and Device B; both tokens active server-side; re-open app produces no duplicates (quickstart Scenario 1).

- [x] T015 [US3] Wire `registerDevice(userId)` into the sign-in/post-auth flow in `src/features/auth/` (call after permission granted; never blocks sign-in on failure)
- [x] T016 [US3] Implement the offline registration retry in `src/features/notifications/application/hooks/useNotificationSetup.ts`: persist failed registration intent in AsyncStorage and retry on app foreground / network restoration via the existing `useNetworkStatus` pattern
- [ ] T017 [US3] Validate quickstart Scenario 1 on the Android dev build: single-device row check, two-device count check, re-authentication upsert check (no duplicates) via `SELECT * FROM device_push_tokens WHERE user_id = '<id>' AND is_active = true` (depends on T015, T016)

**Checkpoint**: US3 fully functional and testable independently — tokens register, survive re-auth, retry offline

---

## Phase 4: User Story 1 — Customer Order Lifecycle Notifications (Priority: P1) 🎯 MVP

**Goal**: Customers receive distinct human-readable notifications for `accepted`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`, and `released`; tap deep-links to the order detail screen.

**Independent Test**: Background the app, advance an order through each status plus cancel and release paths; each produces a distinct notification that opens the correct order (quickstart Scenarios 2, 7, 9-customer).

### Implementation for User Story 1

- [x] T018 [US1] Create `supabase/functions/notify-order-status/index.ts` (depends on the finalized T007 schema and `contracts/supabase-edge-function.md`): read webhook event by `record.id`, atomic claim via the Supabase client (`update({dispatch_status:'processing'}).eq('id',eventId).eq('dispatch_status','pending').select()` — single statement, atomic; exit `already_claimed` unless exactly 1 row returned; no helper RPC), resolve the order customer + order context server-side from `orders`/`restaurants` (never trust the webhook payload), select the customer's `is_active` tokens honoring stored `locale`, compose per-device-locale titles/bodies (EN + AR minimum) for the six customer event types (`order_accepted`, `order_preparing`, `order_out_for_delivery`, `order_delivered`, `order_cancelled`, `order_released` with "finding a new driver" messaging), send via Expo Push API in batches of ≤100 with `data: { url: '/(customer)/orders/{order_id}', event_type, order_id }`, mark rows `sent`/`failed` with receipts, set `is_active = false` on `DeviceNotRegistered` tokens; no retry logic (FR-018)
- [x] T019 [US1] Deploy the function with `supabase functions deploy notify-order-status` and verify end-to-end (depends on T009 migrations applied, T010 webhook created, T018): trigger a status transition, check the `notification_events` row flips `pending → sent`, then re-POST the same webhook payload and confirm the function exits `already_claimed` with no second push
- [x] T020 [US1] Implement customer tap deep-linking in the root layout `src/app/_layout.tsx`: `addNotificationResponseReceivedListener` → `router.push(data.url)` plus `getLastNotificationResponseAsync()` for cold-start (depends on T013)
- [ ] T021 [US1] Validate quickstart Scenarios 2, 7, and 9-customer on the Android dev build: 4 advancing-transition notifications + cancel + release notifications, all device-locale correct, tap navigates to `/(customer)/orders/{orderId}`, `notification_events` rows all `sent` (depends on T019, T020)

**Checkpoint**: US1 fully functional — full customer lifecycle notifies end-to-end

---

## Phase 5: User Story 2 — Available Driver Pool Notifications (Priority: P1)

**Goal**: Eligible Available drivers (no active delivery) get one pool push per new/released order revealing only zone + value; tap opens the pool.

**Independent Test**: Available, Offline, and mid-delivery drivers registered; new order and release each notify exactly the eligible set with PII-free bodies (quickstart Scenarios 3, 9-driver).

### Implementation for User Story 2

- [x] T022 [US2] Extend `supabase/functions/notify-order-status/index.ts` with `new_order_pool` dispatch: eligible-driver query exactly as specified in `contracts/supabase-edge-function.md` (`profiles.role = 'driver'` AND `driver_profiles.is_available = true` AND `NOT EXISTS` active delivery `IN ('accepted', 'preparing', 'out_for_delivery')` AND `device_push_tokens.is_active = true`), body contains only pickup zone + formatted total (never customer name/phone/address/items), release fires reuse the same path for the re-entered order; redeploy (depends on T019)
- [x] T023 [US2] Implement driver tap deep-linking in the driver root layout: notification tap → `router.push('/(driver)/available-orders')` (depends on T013)
- [ ] T024 [US2] Validate quickstart Scenarios 3 and 9-driver: 2-of-4 delivery (Offline + mid-delivery drivers silent), PII-free body assertion, tap opens the pool, release re-push received, stale-tap pool behavior clean (depends on T022, T023)

**Checkpoint**: US1 + US2 both work — the full order loop (place → notify drivers → claim → notify customer) is live

---

## Phase 6: User Story 4 — Push Token Deactivation on Sign-Out (Priority: P2)

**Goal**: Sign-out deactivates the device token server-side (immediate local clear + queued server invalidation when offline); no cross-account leakage.

**Independent Test**: User A sign-out → event produces nothing on the device; User B sign-in on the same device receives only User B's events (quickstart Scenario 4).

- [x] T025 [US4] Wire `deactivateDevice()` into the sign-out sequence in `src/features/auth/` (run before/concurrent with session termination; if offline, clear local token state immediately and queue server-side `is_active = false` for next network contact)
- [ ] T026 [US4] Validate quickstart Scenario 4: `is_active = false` after sign-out, A-event silence, B-event delivery, A-event silence-after-B-sign-in (depends on T025)

**Checkpoint**: US4 complete — account isolation for push guaranteed

---

## Phase 7: User Story 5 — Contextual Permission Request & Non-Blocking Fallback (Priority: P2)

**Goal**: Permission prompt fires exactly once at the first high-intent moment (post-first-order for customers, post-first-Available-toggle for drivers); denial never blocks the app.

**Independent Test**: Guest browsing shows no prompt; first order / first toggle prompts once; deny → full functionality; second order → no re-prompt (quickstart Scenario 5).

- [x] T027 [US5] Create `src/features/notifications/application/hooks/useNotificationPermission.ts`: `notification_permission_prompted` AsyncStorage flag, status check via `getPermissionStatus()`, prompt-then-`registerDevice()` on grant
- [x] T028 [US5] Integrate the hook into the checkout `placeOrder` success callback (customer) and the driver `toggleAvailability(true)` success callback (driver) (depends on T027)
- [ ] T029 [US5] Validate quickstart Scenario 5: no prompt for guests, single prompt at trigger, full functionality on deny, no re-prompt (depends on T028)

**Checkpoint**: US5 complete — high-intent prompting with non-blocking fallback

---

## Phase 8: User Story 6 — Foreground Notification Suppression & Deep Linking (Priority: P3)

**Goal**: Foregrounded app shows zero notification UI (realtime is the sole signal); background/locked shows standard OS banners that deep-link.

**Independent Test**: Foreground status change → silent realtime update only; backgrounded change → banner with sound/vibration → tap navigates (quickstart Scenario 6).

- [x] T030 [US6] Configure `setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }) })` at app startup in `src/app/_layout.tsx` (depends on T013)
- [ ] T031 [US6] Validate quickstart Scenario 6: foreground silence (no banner/toast/snackbar) + background banner with sound/vibration (depends on T030)

**Checkpoint**: All user stories independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cross-story quality gates and full validation pass

- [x] T032 Audit bilingual coverage: every one of the 7 event types has EN + AR title/body templates in `supabase/functions/notify-order-status/index.ts` (no hardcoded single-locale strings)
- [ ] T033 [P] Measure SC-001 dispatch latency (DB transition → device receipt) across Scenarios 2–3; document any free-tier cold-start overruns as accepted MVP variance, not new infra
- [ ] T034 Run the full `quickstart.md` pass (Scenarios 1–9) on the Android dev build and check off all 21 verification checklist items
- [x] T035 Final sweep: no `service_role`/webhook secrets in client code, no client-side notification triggering paths, no leftover `console` noise in `src/features/notifications/` (depends on T034)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T003 (dev build) should land early since all validation needs it.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories. T006/T007 author in parallel against the frozen data-model contract (separate files); T008 authors after T007 (its trigger references the T007 table + `dedupe_key` contract) — T009 applies all three in timestamp order (T006 → T007 → T008); T009 blocks T010 (webhook) and T014 (RLS checks); T012 blocks T013; T018 implements against the finalized T007 schema and edge-function contract.
- **User Stories (Phases 3–8)**: All depend on Foundational completion.
  - US3 (registration) is the transport prerequisite for meaningful US1/US2 validation — run it first.
  - US1 creates the Edge Function; US2 extends the same file — run sequentially (T022 depends on T019).
  - US4, US5, US6 integrate the Foundational client infra into auth/checkout/layout flows — mutually independent after Foundational.
- **Polish (Phase 9)**: Depends on all stories being complete.

### User Story Dependencies

- **US3 (P1)**: After Foundational — no other-story dependencies.
- **US1 (P1)**: After Foundational + US3 (needs registered tokens to validate dispatch). T019 additionally requires T009 + T010 (applied schema, live webhook).
- **US2 (P1)**: After Foundational + US1 (T022 extends the Edge Function file created in T018 — sequential, not parallel).
- **US4 (P2)**: After Foundational — independent of US1/US2.
- **US5 (P2)**: After Foundational — independent of US1/US2/US4.
- **US6 (P3)**: After Foundational — independent of other stories.

### Within Each User Story

- Implement → validate via the story's quickstart scenario (manual validation; no TDD test files requested).
- Server before client wiring where the story spans both (T018 → T020; T022 → T023).
- Story checkpoint must pass before counting the story complete.

### Parallel Opportunities

- Phase 1: T002, T004, T005 can run in parallel (different concerns, no shared files); T001 first (T003 needs it).
- Phase 2: T006, T007 in parallel (separate migration files, frozen contract); T008 after T007 (references its table/contract); T011, T012 in parallel (separate files); T010 and T013 after their prerequisites.
- After Foundational: US4, US5, US6 can proceed in parallel (different integration points: auth, checkout/toggle, layout); US1 → US2 must stay sequential (shared Edge Function file).
- Phase 9: T032 and T033 in parallel.

---

## Parallel Example: Foundational Migrations

```bash
# Launch the two independent migration tasks together (separate files, frozen contract):
Task: "Create migration YYYYMMDD_create_device_push_tokens.sql with upsert key, platform CHECK, RLS own-row policies"
Task: "Create migration YYYYMMDD_create_notification_events.sql with 7-type CHECK, dedupe_key UNIQUE (event_seq-sourced), processing status, no client policies"
# Then the trigger migration (references the events table — after T007):
Task: "Create migration YYYYMMDD_create_order_notification_trigger.sql with event_seq column, BEFORE seq trigger, WHEN-guarded rows-only AFTER trigger"
```

## Parallel Example: User Story 5 (after Foundational)

```bash
# US4, US5, US6 integrate different app surfaces and can run concurrently:
Task: "Wire deactivateDevice() into sign-out sequence in src/features/auth/ [US4]"
Task: "Create useNotificationPermission.ts + integrate into checkout and availability toggle [US5]"
Task: "Configure setNotificationHandler suppression in src/app/_layout.tsx [US6]"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup (EAS dev build on device early — nothing validates without it)
2. Complete Phase 2: Foundational (server pipeline + webhook + client infra + RLS proofs)
3. Complete Phase 3: US3 (token transport live)
4. Complete Phase 4: US1 (customer lifecycle notifies) + Phase 5: US2 (driver pool notifies)
5. **STOP and VALIDATE**: full order loop on two physical devices (Scenarios 1–3, 7, 9)
6. Deploy/demo the MVP

### Incremental Delivery

1. Setup + Foundational → pipeline provably secure and idempotent before any UX work
2. + US3 → registration transport live
3. + US1 → customer milestone pushes live (MVP core)
4. + US2 → driver pool pushes live (fulfillment loop closed)
5. + US4 → account isolation hardened
6. + US5 → opt-in rates optimized via high-intent prompts
7. + US6 → foreground UX finalized
8. + Polish → 21-item checklist green

### Parallel Team Strategy

With multiple developers after Foundational:

1. Developer A: US1 → US2 (sequential — shared Edge Function file)
2. Developer B: US3 → US4 (auth-surface integration)
3. Developer C: US5 → US6 (prompt hooks + layout suppression)

---

## Notes

- [P] tasks = different files, no dependencies — safe for parallel execution
- [Story] label maps each story-phase task to its user story for traceability
- Field constraints are quoted verbatim from data-model.md (CHECK lists, defaults, predicates) — no implementation-time discretion
- `dedupe_key` (`order_id:event_type:event_seq`, row-lock-serialized via `orders.event_seq` — never `COUNT(*)`) + client-API claim pattern (T008/T018) is what makes webhook redelivery safe — do not "simplify" it away
- Never put `service_role`, webhook secrets, or Vault references in `src/` — T035 enforces this
- Commit after each task or logical group; stop at any checkpoint to validate independently
