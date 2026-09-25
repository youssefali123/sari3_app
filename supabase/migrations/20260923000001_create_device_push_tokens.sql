-- Device push token registrations (feature 004-push-notifications).
-- Upsert key: push_token (UNIQUE). Multi-device per user: one row per device.
-- RLS: own-rows only (auth.uid() = user_id); no DELETE policy (sign-out sets
-- is_active = false); service_role bypasses RLS for Edge Function dispatch.

CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  locale TEXT NOT NULL DEFAULT 'en',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT device_push_tokens_push_token_nonempty CHECK (LENGTH(TRIM(push_token)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user_id
  ON public.device_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_active
  ON public.device_push_tokens(user_id, is_active) WHERE is_active = true;

ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_insert_own_tokens ON public.device_push_tokens;
CREATE POLICY users_insert_own_tokens ON public.device_push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS users_update_own_tokens ON public.device_push_tokens;
CREATE POLICY users_update_own_tokens ON public.device_push_tokens
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS users_select_own_tokens ON public.device_push_tokens;
CREATE POLICY users_select_own_tokens ON public.device_push_tokens
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 003 grant discipline: no anon access, no PUBLIC access.
REVOKE ALL ON public.device_push_tokens FROM PUBLIC;
REVOKE ALL ON public.device_push_tokens FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;
