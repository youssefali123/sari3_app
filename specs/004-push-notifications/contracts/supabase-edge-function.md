# Contract: Notification Dispatch Edge Function

**Feature Branch**: `004-push-notifications`
**Date**: 2026-09-22

## Overview

A Supabase Edge Function (`notify-order-status`) invoked by a Supabase Database Webhook on `notification_events` INSERTs. The webhook fires asynchronously, outside the order transaction; the function claims the event row, resolves notification targets, composes locale-aware messages, and dispatches via the Expo Push API. The function is safe to invoke more than once for the same event (see Idempotency).

## Webhook Invocation

The Postgres trigger on `orders` writes event rows only — it performs no HTTP. The Database Webhook POSTs the new row to this Edge Function (authenticated via the webhook-configured Authorization header). Payload:

```json
{
  "type": "INSERT",
  "table": "notification_events",
  "record": {
    "id": "event-uuid",
    "event_type": "order_accepted",
    "order_id": "uuid",
    "dedupe_key": "<order_id>:order_accepted:1",
    "target_role": "customer",
    "dispatch_status": "pending"
  },
  "schema": "public"
}
```

The function MUST re-read the row by `id` and atomically claim it before sending, using the Supabase client (single statement — predicate and row lock make it atomic; no helper RPC):

```typescript
const { data, error } = await supabase
  .from('notification_events')
  .update({ dispatch_status: 'processing' })
  .eq('id', eventId)
  .eq('dispatch_status', 'pending')
  .select('id');
if (error) throw error;
if (data.length !== 1) return { success: true, reason: 'already_claimed' };
// ... resolve recipients, send, then mark sent/failed with receipts
```

Only the invocation whose claim returned 1 row proceeds to the Expo Push API; all others exit with `{"success": true, "reason": "already_claimed"}`. After sending, the function marks the row `sent` (storing Expo receipts) or `failed`.

| Field | Type | Description |
|-------|------|-------------|
| `record.id` | `string (UUID)` | The event row to claim and process |
| `record.event_type` | `string` | One of the 7 event types (determines target + message template) |
| `record.order_id` | `string (UUID)` | The order that triggered the status change |
| `record.dedupe_key` | `string` | Per-transition identity `order_id:event_type:event_seq` |

Order context for message composition (customer id, store name, total, pickup zone) is read server-side from `orders`/`restaurants` inside the function — never trusted from the webhook payload.

## Recipient Resolution (dispatch-time, server-side)

`notification_events` carries NO recipient list (no `target_user_ids` — a stored list would be stale the moment availability changes). The function resolves recipients at send time:

- **Customer lifecycle events** (`order_accepted`, `order_preparing`, `order_out_for_delivery`, `order_delivered`, `order_cancelled`, `order_released`): read the order's `customer_id` from `orders`, then select that customer's rows from `device_push_tokens` where `is_active = true`, honoring each row's stored `locale`.
- **`new_order_pool`**: run the eligible-driver query in Driver Targeting below at send time — only drivers eligible *at that moment* with active tokens are targeted.

## Response

The Edge Function returns:

**Success (200)**:
```json
{
  "success": true,
  "event_id": "uuid",
  "dispatched_count": 3
}
```

**Already claimed / no targets (200)**:
```json
{
  "success": true,
  "event_id": "uuid",
  "dispatched_count": 0,
  "reason": "already_claimed | no_active_tokens"
}
```

**Error (500)**:
```json
{
  "success": false,
  "error": "Error description"
}
```

## Notification Event Type Mapping

| Status Transition | Event Type | Target | Title Pattern (EN) | Body Pattern (EN) |
|---|---|---|---|---|
| `* → pending` (new order INSERT) | `new_order_pool` | Eligible drivers (see Driver Targeting) | "New order available" | "Pickup from {pickup_zone} · {formatted_total}" |
| `active → pending` (release UPDATE: `OLD.status IN ('accepted','preparing','out_for_delivery')`, mirrors 003 `emit_driver_pool_signal`) | `order_released` | Order customer | "Finding a new driver" | "Your driver released your order from {store_name} — we're finding a new one" |
| `active → pending` (release UPDATE, same fire) | `new_order_pool` | Eligible drivers (see Driver Targeting) | "New order available" | "Pickup from {pickup_zone} · {formatted_total}" |
| `pending → accepted` | `order_accepted` | Order customer | "Driver on the way!" | "Your order from {store_name} has been accepted" |
| `accepted → preparing` | `order_preparing` | Order customer | "Being prepared" | "Your order from {store_name} is being prepared" |
| `preparing → out_for_delivery` | `order_out_for_delivery` | Order customer | "Out for delivery" | "Your order from {store_name} is on its way!" |
| `out_for_delivery → delivered` | `order_delivered` | Order customer | "Delivered!" | "Your order from {store_name} has been delivered" |
| `* → cancelled` | `order_cancelled` | Order customer | "Order cancelled" | "Your order from {store_name} has been cancelled" |

## Driver Targeting

`new_order_pool` recipients MUST mirror `get_available_orders()` pool semantics, using the actual 003 schema — a driver is eligible IFF all four hold:

```text
profiles.role = 'driver'
AND driver_profiles.is_available = true
AND no active delivery (no orders row with driver_id = self AND status IN ('accepted','preparing','out_for_delivery'))
AND device_push_tokens.is_active = true
```

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

**Push delivery grants nothing**: receiving a pool notification confers no ownership of the order. The authoritative operation remains `claim_order()` — the database (atomic conditional write per Principle VI) decides whether the driver successfully claims. Two drivers racing the same order resolve exactly as 003 defines; the loser sees the pool UI reflect current server state.

## Release Flow

```text
Driver accepts order (claim_order)
    ↓
Order assigned to driver (status active, driver_id set)
    ↓
Driver releases per existing business rules (release_order: reason required, active → pending, driver_id NULL)
    ↓
Order returns to the unclaimed pool
    ↓
Trigger writes TWO event rows: order_released (customer) + new_order_pool (drivers)
    ↓
Eligible available drivers are notified again
```

**No notification loops**: an `order_released` row represents a real regression into the pool (guarded by the trigger's `OLD.status IN (active…) AND NEW.status = 'pending'` predicate, mirroring 003's `emit_driver_pool_signal`). Each release transition carries a distinct `orders.event_seq`, so exactly one `order_released` row exists per release transition (`ON CONFLICT (dedupe_key) DO NOTHING` collapses re-execution), while a later second release is a new transition producing a new row — releases are never deduplicated into one lifetime event. Re-processing the same transition is blocked by the claim + UNIQUE invariant. `claim_order()` / `release_order()` business semantics are unchanged.

## Localization

The Edge Function resolves the `locale` field from each target's `device_push_tokens` row and composes the title/body in the appropriate language. Minimum supported locales:

| Locale | Title Pattern Example | Body Pattern Example |
|--------|----------------------|---------------------|
| `en` | "Driver on the way!" | "Your order from {store_name} has been accepted" |
| `ar` | "السائق في الطريق!" | "تم قبول طلبك من {store_name}" |

## Deep Link URL Patterns

| Event Type | Deep Link URL | Target Screen |
|------------|--------------|---------------|
| `order_accepted` | `/(customer)/orders/{order_id}` | Customer order detail |
| `order_preparing` | `/(customer)/orders/{order_id}` | Customer order detail |
| `order_out_for_delivery` | `/(customer)/orders/{order_id}` | Customer order detail |
| `order_delivered` | `/(customer)/orders/{order_id}` | Customer order detail |
| `order_cancelled` | `/(customer)/orders/{order_id}` | Customer order detail |
| `order_released` | `/(customer)/orders/{order_id}` | Customer order detail |
| `new_order_pool` | `/(driver)/available-orders` | Driver available orders pool |

## Expo Push API Call

The Edge Function sends notifications via:

```
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json

[
  {
    "to": "ExponentPushToken[xxx]",
    "title": "Driver on the way!",
    "body": "Your order from Restaurant Name has been accepted",
    "data": {
      "url": "/(customer)/orders/abc-123",
      "event_type": "order_accepted",
      "order_id": "abc-123"
    },
    "sound": "default",
    "channelId": "order-updates"
  }
]
```

Batching: Up to 100 messages per API call.

## Token Pruning

After receiving Expo Push API receipts, the Edge Function checks for `DeviceNotRegistered` errors and deactivates the corresponding tokens:

```sql
UPDATE device_push_tokens
SET is_active = false, updated_at = now()
WHERE push_token = $1;
```
