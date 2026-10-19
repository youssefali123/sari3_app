-- Security hardening: Revoke direct EXECUTE on emit_driver_pool_signal trigger function.
--
-- 1. Context & Existing Grants:
--   In PostgreSQL, functions created in the public schema grant EXECUTE to PUBLIC by default.
--   Consequently, PostgREST exposed `public.emit_driver_pool_signal()` as a public RPC endpoint
--   at `/rest/v1/rpc/emit_driver_pool_signal`.
--
-- 2. Purpose & Target Behavior:
--   `public.emit_driver_pool_signal()` was designed strictly as a trigger function invoked
--   AFTER INSERT OR UPDATE on `public.orders` to populate `public.driver_pool_signals`.
--   It has no direct application callers (verified across all client and backend code).
--   Allowing public or authenticated callers to invoke it via RPC is unnecessary and permits
--   unauthenticated HTTP requests to trigger execution errors or invalid trigger states.
--
-- 3. Trigger Invocation Semantics:
--   Under PostgreSQL security architecture, row-level triggers execute as part of the table DML
--   engine. Callers of INSERT/UPDATE on `public.orders` do not require direct EXECUTE privilege
--   on the trigger function.
--   IMPORTANT: Operational status of the trigger cannot be assumed solely from `pg_trigger.tgenabled`.
--   Functional verification (testing actual signal insertion during order status changes) must be
--   performed in a test environment following deployment.
--
-- 4. Scope of Grants:
--   - Revoke EXECUTE from PUBLIC, anon, and authenticated.
--   - Grant EXECUTE explicitly to service_role for administrative/maintenance tasks.

REVOKE EXECUTE ON FUNCTION public.emit_driver_pool_signal() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.emit_driver_pool_signal() TO service_role;
