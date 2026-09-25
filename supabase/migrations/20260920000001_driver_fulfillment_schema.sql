-- Driver fulfillment schema: driver_order_interactions for declines/releases.
-- Feature: 003-driver-fulfillment
--
-- Note: availability stays on the existing driver_profiles.is_available
-- column (single source of truth); no profiles alteration in this feature.

CREATE TABLE IF NOT EXISTS public.driver_order_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('declined', 'released')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT doi_release_requires_reason CHECK (
    interaction_type != 'released' OR (reason IS NOT NULL AND TRIM(reason) != '')
  )
);

-- Partial unique index: a driver can only decline an order once.
-- Releases are NOT constrained, allowing repeat releases if an order
-- is re-accepted later.
CREATE UNIQUE INDEX IF NOT EXISTS doi_unique_decline
  ON public.driver_order_interactions(driver_id, order_id)
  WHERE interaction_type = 'declined';

CREATE INDEX IF NOT EXISTS doi_driver_idx ON public.driver_order_interactions(driver_id);
CREATE INDEX IF NOT EXISTS doi_order_idx ON public.driver_order_interactions(order_id);
CREATE INDEX IF NOT EXISTS doi_driver_type_idx ON public.driver_order_interactions(driver_id, interaction_type);

ALTER TABLE public.driver_order_interactions ENABLE ROW LEVEL SECURITY;

-- Read own interactions only. Writes happen exclusively through the
-- SECURITY DEFINER driver RPCs (no INSERT/UPDATE/DELETE policies).
DROP POLICY IF EXISTS driver_interactions_select ON public.driver_order_interactions;
CREATE POLICY driver_interactions_select ON public.driver_order_interactions
  FOR SELECT TO authenticated
  USING (driver_id = auth.uid());

-- Explicit grant (Supabase default privileges normally cover this, but the
-- select policy is meaningless without the table-level privilege).
GRANT SELECT ON public.driver_order_interactions TO authenticated;
