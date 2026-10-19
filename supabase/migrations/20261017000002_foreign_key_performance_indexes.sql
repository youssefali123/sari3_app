-- Performance Optimization: Covering indexes for unindexed foreign keys.
--
-- 1. Locking Implications & Migration Strategy:
--   - Ordinary `CREATE INDEX`: Acquires a `SHARE` lock on the target table.
--     Reads (SELECT) remain unblocked, but writes (INSERT, UPDATE, DELETE) are blocked
--     for the duration of the index build.
--   - `CREATE INDEX CONCURRENTLY`: Avoids blocking writes (acquires `SHARE UPDATE EXCLUSIVE`),
--     but CANNOT execute inside a transaction block (PostgreSQL error: CREATE INDEX CONCURRENTLY
--     cannot run inside a transaction block).
--   - Limitation of Repository Evidence: Repository migration files define the table structure
--     but do not provide live row counts, disk sizes, or concurrent write throughput.
--   - Rationale: Standard Supabase migration pipelines (`supabase db push` / `apply_migration`)
--     execute migration scripts inside a single transaction block. Therefore, standard
--     `CREATE INDEX IF NOT EXISTS` is provided here to ensure compatibility with transactional
--     migration runners.
--   - Operator Recommendation: If applying this migration to a live production database with
--     significant data volume or continuous write traffic, administrators should evaluate
--     running these 9 statements individually outside a transaction block using
--     `CREATE INDEX CONCURRENTLY`.
--
-- 2. Index Coverage Analysis (Non-Duplication Verification):
--   - `coupon_redemptions (coupon_id, order_id)`: Existing indexes are only PK (id) and customer_id.
--   - `coupons (store_id)`: Existing indexes are PK (id) and code (unique).
--   - `driver_pool_signals (order_id)`: Existing indexes are PK (id) and created_at.
--   - `favorite_products (product_id)`: Existing index is composite PK (customer_id, product_id).
--     Because `product_id` is the second column, PostgreSQL B-tree mechanics cannot use it as
--     a leading column to optimize `ON DELETE CASCADE` scans from `products`.
--   - `favorite_stores (store_id)`: Similar to favorite_products; store_id is column 2 of composite PK.
--   - `promotion_targets (product_id, promotion_id, store_id)`: Only existing index is PK (id).

-- 1. coupon_redemptions: foreign key to coupons(id) ON DELETE RESTRICT
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id
    ON public.coupon_redemptions USING btree (coupon_id);

-- 2. coupon_redemptions: foreign key to orders(id) ON DELETE RESTRICT
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order_id
    ON public.coupon_redemptions USING btree (order_id);

-- 3. coupons: foreign key to restaurants(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_coupons_store_id
    ON public.coupons USING btree (store_id);

-- 4. driver_pool_signals: foreign key to orders(id) ON DELETE CASCADE
--    Also covers: DELETE FROM driver_pool_signals WHERE order_id = NEW.id
CREATE INDEX IF NOT EXISTS idx_driver_pool_signals_order_id
    ON public.driver_pool_signals USING btree (order_id);

-- 5. favorite_products: foreign key to products(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_favorite_products_product_id
    ON public.favorite_products USING btree (product_id);

-- 6. favorite_stores: foreign key to restaurants(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_favorite_stores_store_id
    ON public.favorite_stores USING btree (store_id);

-- 7. promotion_targets: foreign key to products(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_promotion_targets_product_id
    ON public.promotion_targets USING btree (product_id);

-- 8. promotion_targets: foreign key to promotions(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_promotion_targets_promotion_id
    ON public.promotion_targets USING btree (promotion_id);

-- 9. promotion_targets: foreign key to restaurants(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_promotion_targets_store_id
    ON public.promotion_targets USING btree (store_id);
