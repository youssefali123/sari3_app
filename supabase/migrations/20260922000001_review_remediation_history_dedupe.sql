-- Follow-up to 20260922000000_review_remediation: the cancelled branch added
-- there unions with the declined/released branches, so a driver whose
-- declined (or released) order was later cancelled saw TWO history entries
-- for the same order. US5-AS3 requires the cancelled order to appear with
-- the correct FINAL status — one entry per order.
--
-- Semantics after this migration:
-- - Order currently 'cancelled' + driver interacted (declined, or
--   accepted-then-released): exactly ONE 'cancelled' entry. The driver's
--   earlier declined/released entry for that order is superseded.
-- - Order in any other status: declined/released entries behave as before.
-- - DISTINCT ON guards the pathological case of multiple interactions by
--   the same driver on one cancelled order (latest interaction wins).

CREATE OR REPLACE FUNCTION public.get_driver_history()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_history JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT app_private.has_role('driver') THEN
    RAISE EXCEPTION 'ONLY_DRIVERS_CAN_VIEW_HISTORY' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(h ORDER BY h.order_date DESC), '[]'::jsonb)
    INTO v_history
    FROM (
      -- Completed orders
      SELECT o.id AS id,
             o.id AS order_id,
             o.restaurant_name AS store_name,
             o.delivered_at AS order_date,
             'completed' AS final_status,
             NULL::text AS release_reason
        FROM public.orders o
       WHERE o.driver_id = auth.uid()
         AND o.status = 'delivered'

      UNION ALL

      -- Declined orders (superseded by 'cancelled' once the order is cancelled)
      SELECT doi.id AS id,
             o.id AS order_id,
             o.restaurant_name AS store_name,
             doi.created_at AS order_date,
             'declined' AS final_status,
             NULL::text AS release_reason
        FROM public.driver_order_interactions doi
        JOIN public.orders o ON o.id = doi.order_id
       WHERE doi.driver_id = auth.uid()
         AND doi.interaction_type = 'declined'
         AND o.status IS DISTINCT FROM 'cancelled'

      UNION ALL

      -- Released orders (superseded by 'cancelled' once the order is cancelled)
      SELECT doi.id AS id,
             o.id AS order_id,
             o.restaurant_name AS store_name,
             doi.created_at AS order_date,
             'released' AS final_status,
             doi.reason AS release_reason
        FROM public.driver_order_interactions doi
        JOIN public.orders o ON o.id = doi.order_id
       WHERE doi.driver_id = auth.uid()
         AND doi.interaction_type = 'released'
         AND o.status IS DISTINCT FROM 'cancelled'

      UNION ALL

      -- Cancelled orders the driver previously interacted with (US5-AS3 /
      -- ambiguity A1: declined it while pending, or accepted-then-released
      -- it — a release implies prior acceptance). Drivers who never
      -- interacted with the order never see it. One entry per order.
      -- (Nested subquery: DISTINCT ON needs its own ORDER BY, which cannot
      -- sit directly on a UNION ALL branch.)
      SELECT id, order_id, store_name, order_date, final_status, release_reason
        FROM (
          SELECT DISTINCT ON (o.id)
                 doi.id AS id,
                 o.id AS order_id,
                 o.restaurant_name AS store_name,
                 o.updated_at AS order_date,
                 'cancelled' AS final_status,
                 NULL::text AS release_reason
            FROM public.driver_order_interactions doi
            JOIN public.orders o ON o.id = doi.order_id
           WHERE doi.driver_id = auth.uid()
             AND o.status = 'cancelled'
           ORDER BY o.id, doi.created_at DESC
        ) c
    ) h;

  RETURN v_history;
END;
$function$;
