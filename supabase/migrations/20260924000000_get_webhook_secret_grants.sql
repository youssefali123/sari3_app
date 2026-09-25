-- Codify the privilege state of public.get_webhook_secret() (feature 004-push-notifications).
--
-- Context: the Edge Function supabase/functions/notify-order-status/index.ts reads the
-- Vault-held webhook secret through the service-role-only SECURITY DEFINER helper
-- public.get_webhook_secret(). The helper was created out-of-band (T010 webhook/Vault
-- setup), so no GRANT/REVOKE for it is versioned in earlier migrations. Live probing
-- confirms the correct locked-down state: authenticated (non-service_role) callers get
-- HTTP 403 / SQLSTATE 42501 "permission denied for function get_webhook_secret", while
-- a nonexistent function returns 404/PGRST202 — proving the function exists but is
-- revoked from everyone except service_role.
--
-- Discipline: 003 grant discipline documented in specs/004-push-notifications/research.md:60
-- and specs/004-push-notifications/data-model.md:111 (REVOKE FROM PUBLIC, anon;
-- GRANT only to the privileged role). For a secret-reader helper the correct
-- specialization is service_role-only: authenticated is also revoked, so even signed-in
-- clients cannot read the webhook secret. This matches the precedent in
-- 20260923000003_create_order_notification_trigger.sql:129, which revokes EXECUTE on the
-- trigger helper from PUBLIC, anon, authenticated with no grant back.
--
-- Effect: no-op on the live database (privileges already in this state); purely makes the
-- existing protection reproducible from a clean database via `supabase db push`.

REVOKE ALL ON FUNCTION public.get_webhook_secret() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_webhook_secret() TO service_role;
