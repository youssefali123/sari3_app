// notify-order-status — Supabase Edge Function (feature 004-push-notifications)
//
// Invoked by the notification_events INSERT webhook (pg_net) with
// { event_id }. Auth is a Vault-held bearer secret shared with the webhook
// trigger (never a client-held credential). Flow:
//   1. Verify bearer against Vault.
//   2. Atomically claim the event row (pending -> processing) — webhook
//      redelivery of the same event is a no-op (claim-before-send).
//   3. Resolve order context server-side (never trust the webhook payload).
//   4. Resolve recipients: customer tokens (locale-aware templates, EN/AR)
//      or eligible drivers (role=driver, Available, no active delivery,
//      active token) for pool events.
//   5. Send via the Expo Push API in batches of <= 100.
//   6. Mark sent/failed with receipts; prune DeviceNotRegistered tokens.
// No retry logic (FR-018): a failed dispatch leaves the row 'failed'.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const WEBHOOK_SECRET_NAME = 'notify_order_status_webhook_secret';

type Platform = 'ios' | 'android';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data: { url: string; event_type: string; order_id: string };
  sound: 'default';
  channelId: string;
}

interface DeviceTokenRow {
  push_token: string;
  locale: string;
}

interface CustomerTemplates {
  title: string;
  body: string;
}

// ---- Locale-aware customer templates (FR-010: EN + AR minimum) ------------
function customerCopy(
  eventType: string,
  storeName: string,
  locale: string,
): CustomerTemplates {
  const ar = locale?.toLowerCase().startsWith('ar');
  switch (eventType) {
    case 'order_accepted':
      return ar
        ? { title: 'السائق في الطريق!', body: `تم قبول طلبك من ${storeName}` }
        : { title: 'Driver on the way!', body: `Your order from ${storeName} has been accepted` };
    case 'order_preparing':
      return ar
        ? { title: 'جاري التحضير', body: `طلبك من ${storeName} قيد التحضير` }
        : { title: 'Being prepared', body: `Your order from ${storeName} is being prepared` };
    case 'order_out_for_delivery':
      return ar
        ? { title: 'في الطريق إليك', body: `طلبك من ${storeName} في الطريق إليك!` }
        : { title: 'Out for delivery', body: `Your order from ${storeName} is on its way!` };
    case 'order_delivered':
      return ar
        ? { title: 'تم التوصيل!', body: `تم توصيل طلبك من ${storeName}` }
        : { title: 'Delivered!', body: `Your order from ${storeName} has been delivered` };
    case 'order_cancelled':
      return ar
        ? { title: 'تم إلغاء الطلب', body: `تم إلغاء طلبك من ${storeName}` }
        : { title: 'Order cancelled', body: `Your order from ${storeName} has been cancelled` };
    case 'order_released':
      return ar
        ? { title: 'نبحث عن سائق جديد', body: `ألقى سائق طلبك من ${storeName} — نبحث عن سائق جديد` }
        : {
            title: 'Finding a new driver',
            body: `Your driver released your order from ${storeName} — we're finding a new one`,
          };
    default:
      return ar
        ? { title: 'تحديث الطلب', body: `تحديث بخصوص طلبك من ${storeName}` }
        : { title: 'Order update', body: `An update on your order from ${storeName}` };
  }
}

function poolCopy(pickupZone: string, formattedTotal: string, locale: string): CustomerTemplates {
  const ar = locale?.toLowerCase().startsWith('ar');
  return ar
    ? { title: 'طلب جديد متاح', body: `استلام من ${pickupZone} · ${formattedTotal}` }
    : { title: 'New order available', body: `Pickup from ${pickupZone} · ${formattedTotal}` };
}

function formatTotal(piasters: number): string {
  return `EGP ${(Math.max(0, piasters) / 100).toFixed(2)}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

Deno.serve(async (req: Request) => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Parse the body exactly once (request bodies are single-read) so the
  // error handler below can still reach the event id to mark the row failed.
  let eventId: string | undefined;
  try {
    const parsed = await req.json();
    eventId = parsed?.event_id;
  } catch {
    eventId = undefined;
  }

  try {
    // ---- 1. Authenticate the webhook (Vault-held shared secret) ----------
    // The function reaches Postgres via the Data API (public schema only),
    // so the secret is read through the service-role-only SECURITY DEFINER
    // helper public.get_webhook_secret() (003 grant discipline).
    const authHeader = req.headers.get('Authorization') ?? '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    const { data: expectedSecret, error: secretError } = await admin
      .rpc('get_webhook_secret');
    if (secretError || !expectedSecret || bearer !== expectedSecret) {
      return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!eventId) {
      return new Response(JSON.stringify({ success: false, error: 'missing event_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ---- 2. Claim-before-send (atomic; webhook redelivery is a no-op) ----
    const { data: claimed, error: claimError } = await admin
      .from('notification_events')
      .update({ dispatch_status: 'processing' })
      .eq('id', eventId)
      .eq('dispatch_status', 'pending')
      .select('id, event_type, order_id, target_role, deep_link_url');
    if (claimError) throw new Error(claimError.message);
    if (!claimed || claimed.length !== 1) {
      return new Response(
        JSON.stringify({ success: true, already_claimed: true, dispatched_count: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    const event = claimed[0];

    // ---- 3. Order context, resolved server-side (never trust the payload) -
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, customer_id, restaurant_id, restaurant_name, total_amount')
      .eq('id', event.order_id)
      .single();
    if (orderError || !order) throw new Error('order not found: ' + (orderError?.message ?? ''));
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('address')
      .eq('id', order.restaurant_id)
      .maybeSingle();

    const messages: PushMessage[] = [];

    if (event.target_role === 'customer') {
      // ---- 4a. Customer recipients: all active tokens, per-token locale ----
      const { data: tokens, error: tokenError } = await admin
        .from('device_push_tokens')
        .select('push_token, locale')
        .eq('user_id', order.customer_id)
        .eq('is_active', true);
      if (tokenError) throw new Error(tokenError.message);
      for (const t of (tokens ?? []) as DeviceTokenRow[]) {
        const copy = customerCopy(event.event_type, order.restaurant_name, t.locale);
        messages.push({
          to: t.push_token,
          title: copy.title,
          body: copy.body,
          data: { url: event.deep_link_url, event_type: event.event_type, order_id: order.id },
          sound: 'default',
          channelId: 'order-updates',
        });
      }
    } else {
      // ---- 4b. Pool event: eligible drivers, mirroring get_available_orders -
      // Resolved in sequential queries (supabase-js .in() takes arrays,
      // not nested builders): driver role → Available → minus busy → tokens.
      const { data: driverIds, error: roleErr } = await admin
        .from('profiles')
        .select('id')
        .eq('role', 'driver');
      if (roleErr) throw new Error(roleErr.message);
      const roleIds = (driverIds ?? []).map((r) => r.id);

      let availIds: string[] = [];
      if (roleIds.length > 0) {
        const { data: avail, error: availErr } = await admin
          .from('driver_profiles')
          .select('user_id')
          .eq('is_available', true)
          .in('user_id', roleIds);
        if (availErr) throw new Error(availErr.message);
        availIds = (avail ?? []).map((r) => r.user_id);
      }

      let busyIds: string[] = [];
      if (availIds.length > 0) {
        const { data: busy, error: busyErr } = await admin
          .from('orders')
          .select('driver_id')
          .in('status', ['accepted', 'preparing', 'out_for_delivery'])
          .not('driver_id', 'is', null);
        if (busyErr) throw new Error(busyErr.message);
        busyIds = [...new Set((busy ?? []).map((r) => r.driver_id))];
      }

      const eligible = availIds.filter((id) => !busyIds.includes(id));
      let tokens: DeviceTokenRow[] = [];
      if (eligible.length > 0) {
        const { data: tok, error: tokErr } = await admin
          .from('device_push_tokens')
          .select('push_token, locale')
          .eq('is_active', true)
          .in('user_id', eligible);
        if (tokErr) throw new Error(tokErr.message);
        tokens = (tok ?? []) as DeviceTokenRow[];
      }

      const pickupZone = restaurant?.address ?? 'the store';
      const total = formatTotal(order.total_amount);
      for (const t of tokens) {
        const copy = poolCopy(pickupZone, total, t.locale);
        messages.push({
          to: t.push_token,
          title: copy.title,
          body: copy.body, // PII-free: zone + value only (FR-004)
          data: { url: '/(driver)/available-orders', event_type: event.event_type, order_id: order.id },
          sound: 'default',
          channelId: 'order-updates',
        });
      }
    }

    if (messages.length === 0) {
      await admin
        .from('notification_events')
        .update({ dispatch_status: 'sent', expo_receipts: { note: 'no_active_tokens' } })
        .eq('id', event.id);
      return new Response(
        JSON.stringify({ success: true, event_id: event.id, dispatched_count: 0, reason: 'no_active_tokens' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // ---- 5. Send via the Expo Push API (batches of <= 100) ---------------
    const tickets: { id?: string; error?: string; message?: string }[] = [];
    for (const batch of chunk(messages, 100)) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      const payload = await res.json();
      if (Array.isArray(payload?.data)) tickets.push(...payload.data);
      else if (payload?.errors) tickets.push(...payload.errors);
    }

    // ---- 6. Receipts: prune DeviceNotRegistered tokens (FR-017) ----------
    const receiptIds = tickets.map((t) => t.id).filter((id): id is string => Boolean(id));
    let receipts: Record<string, { status?: string; details?: { error?: string }; message?: string }> = {};
    if (receiptIds.length > 0) {
      for (const idBatch of chunk(receiptIds, 100)) {
        const res = await fetch(EXPO_RECEIPTS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idBatch }),
        });
        const payload = await res.json();
        receipts = { ...receipts, ...(payload?.data ?? {}) };
      }
    }

    const staleTokens: string[] = [];
    tickets.forEach((ticket, idx) => {
      const token = messages[idx]?.to;
      const directError = ticket.error ?? ticket.message;
      const receiptError = ticket.id ? receipts[ticket.id]?.details?.error : undefined;
      if (token && (directError === 'DeviceNotRegistered' || receiptError === 'DeviceNotRegistered')) {
        staleTokens.push(token);
      }
    });
    if (staleTokens.length > 0) {
      await admin
        .from('device_push_tokens')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('push_token', staleTokens);
    }

    const failed = tickets.filter((t) => t.status !== 'ok').length;
    await admin
      .from('notification_events')
      .update({ dispatch_status: failed === tickets.length ? 'failed' : 'sent', expo_receipts: { tickets, receipts } })
      .eq('id', event.id);

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event.id,
        dispatched_count: tickets.length - failed,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    // FR-018: no retry logic — mark failure and return. eventId comes from
    // the body parsed at the top (request bodies are single-read).
    if (eventId) {
      await admin
        .from('notification_events')
        .update({ dispatch_status: 'failed', expo_receipts: { error: String(e) } })
        .eq('id', eventId)
        .eq('dispatch_status', 'processing');
    }
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
