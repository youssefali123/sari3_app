-- Unified Catalog Search (feature 008-catalog-search).
-- pg_trgm trigram matching over store and product names, area-scoped
-- (exact match), guest-accessible (SECURITY INVOKER), ranked by
-- word_similarity, max 20 rows, closed stores included with is_open flag.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm
  ON public.restaurants USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING gin (name gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_catalog(
  p_area_id UUID,
  p_query TEXT
)
RETURNS TABLE (
  result_type TEXT,
  id UUID,
  name TEXT,
  image_url TEXT,
  similarity_score FLOAT4,
  store_id UUID,
  store_name TEXT,
  is_open BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM (
    -- Matching stores (closed stores included — FR-011)
    SELECT
      'store'::text AS result_type,
      r.id AS id,
      r.name AS name,
      r.image_url AS image_url,
      word_similarity(p_query, r.name)::float4 AS similarity_score,
      NULL::uuid AS store_id,
      NULL::text AS store_name,
      r.is_open AS is_open
    FROM public.restaurants r
    WHERE r.area_id = p_area_id
      AND word_similarity(p_query, r.name) > 0.15

    UNION ALL

    -- Matching available products (with their parent store)
    SELECT
      'product'::text AS result_type,
      p.id AS id,
      p.name AS name,
      p.image_url AS image_url,
      word_similarity(p_query, p.name)::float4 AS similarity_score,
      r.id AS store_id,
      r.name AS store_name,
      NULL::boolean AS is_open
    FROM public.products p
    JOIN public.restaurants r ON r.id = p.restaurant_id
    WHERE r.area_id = p_area_id
      AND p.is_available = true
      AND word_similarity(p_query, p.name) > 0.15
  ) combined
  ORDER BY similarity_score DESC
  LIMIT 20;
$$;
