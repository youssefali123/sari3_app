-- Notification event audit log + enqueue records (feature 004-push-notifications).
-- Written ONLY by the order-notification trigger (server-side); the Edge
-- Function claims rows atomically (pending -> processing -> sent/failed).
-- RLS: enabled with NO policies — client access is denied by default; the
-- Edge Function uses service_role, which bypasses RLS.

CREATE TABLE IF NOT EXISTS public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'new_order_pool', 'order_accepted', 'order_preparing',
    'order_out_for_delivery', 'order_delivered', 'order_cancelled', 'order_released'
  )),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  target_role TEXT NOT NULL CHECK (target_role IN ('customer', 'driver')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link_url TEXT NOT NULL,
  dispatch_status TEXT NOT NULL DEFAULT 'pending' CHECK (dispatch_status IN ('pending', 'processing', 'sent', 'failed')),
  dedupe_key TEXT NOT NULL UNIQUE,
  expo_receipts JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_events_order
  ON public.notification_events(order_id);
CREATE INDEX IF NOT EXISTS idx_notification_events_created
  ON public.notification_events(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_events_pending
  ON public.notification_events(created_at) WHERE dispatch_status = 'pending';

ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

-- Intentionally NO policies for authenticated/anon: the mobile app never
-- reads the event log. Deny-by-default.
REVOKE ALL ON public.notification_events FROM PUBLIC;
REVOKE ALL ON public.notification_events FROM anon;
REVOKE ALL ON public.notification_events FROM authenticated;
GRANT ALL ON public.notification_events TO service_role;
