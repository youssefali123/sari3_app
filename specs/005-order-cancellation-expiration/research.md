# Architectural Research: Order Cancellation & Expiration

**Feature**: `005-order-cancellation-expiration`  
**Date**: 2026-09-25  
**Status**: Completed  
**Spec Reference**: [spec.md](./spec.md)

---

## Executive Summary

Feature 005 delivers customer self-service order cancellation across pre-delivery lifecycle states (`pending`, `accepted`, `preparing`, `out_for_delivery`), automatic expiration of stale pending orders after 30 minutes, real-time driver pool invalidation, actor-aware push alerts without self-echoes, customer order history soft-hiding, and catalog-revalidated "Order Again" reordering.

This research establishes the architectural foundation, schema migration strategy, database triggers, RPC contracts, notification routing, and client-side domain reconciliation required to satisfy all functional requirements (FR-001 through FR-028) and constitutional principles.

---

## Research Decisions

### Decision 1: Database Migration Sequencing for Enum Extension (`order_status`)

- **Context**: In PostgreSQL, the `order_status` type is an `ENUM` consisting of `'pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled', 'rejected'`. FR-012 requires adding `'expired'` as an 8th distinct status. Under PostgreSQL transaction rules, a newly added enum value cannot be used in expressions, check constraints, or function bodies within the same multi-statement transaction if executed within a single transaction block.
- **Decision**: Split the migration into two sequentially numbered migrations:
  1. `20260925000001_add_expired_order_status.sql`:
     ```sql
     ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'expired';
     ```
  2. `20260925000002_order_cancellation_expiration.sql`:
     Contains all table alterations (`customer_hidden_at`), trigger replacements (`validate_order_transition`, `emit_driver_pool_signal`, `enqueue_order_notification`), RPC definitions (`cancel_order`, `expire_stale_orders`, `hide_order`, updated `claim_order`, updated `advance_order_status`), and `pg_cron` schedule registration.
- **Rationale**: Guarantees clean, zero-failure migrations across local development, CI test environments, and remote Supabase hosting environments without requiring `ALTER TYPE ... COMMIT` workarounds that fail inside standard migration runners.
- **Alternatives Considered**:
  - *Convert `order_status` to `TEXT` with CHECK constraint*: Rejected because `order_status` is already embedded across indexes, RPC signatures, and foreign triggers. Changing it to text would break backwards compatibility and violate Principle X.
  - *Single migration with dynamic SQL / transaction hacks*: Fragile across different PostgreSQL versions and Supabase CLI versions.

---

### Decision 2: Server-Authoritative Cancellation RPC (`cancel_order`) & Actor GUC

- **Context**: Customers need to cancel orders across `pending`, `accepted`, `preparing`, and `out_for_delivery` states (FR-001). Cancellation must verify ownership (`customer_id = auth.uid()`), be atomic, release assigned driver capacity, prevent duplicate notifications, and eliminate legacy direct update paths (FR-003, FR-004, FR-005, FR-006).
- **Decision**: Implement `public.cancel_order(p_order_id UUID) RETURNS JSONB` as a `SECURITY DEFINER` function with search path `public, auth, pg_temp`:
  1. Verify caller authentication: `IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED' ... END IF;`
  2. Verify order existence and customer ownership: `SELECT * INTO v_order FROM public.orders WHERE id = p_order_id AND customer_id = auth.uid();`
  3. Validate lifecycle state:
     - If status in `('delivered', 'cancelled', 'expired')`: raise descriptive exception (cannot cancel completed or terminal orders).
     - If status not in `('pending', 'accepted', 'preparing', 'out_for_delivery')`: reject.
  4. Set transaction-scoped actor GUC:
     ```sql
     PERFORM set_config('app.cancellation_actor', 'customer', true);
     ```
  5. Atomically update the order:
     ```sql
     UPDATE public.orders
        SET status = 'cancelled',
            updated_at = now()
      WHERE id = p_order_id;
     ```
  6. If order had an assigned driver (`v_order.driver_id IS NOT NULL`):
     - Reset `driver_profiles.current_order_id = NULL` for that driver so their active delivery slot is instantly liberated.
     - Retain `orders.driver_id` on the order row (enabling driver read access via RLS and notification dispatch).
  7. Explicitly drop legacy update policy:
     ```sql
     DROP POLICY IF EXISTS orders_update_own_customer_cancel ON public.orders;
     ```
  8. Return JSON payload `{ success: true, order_id: p_order_id, status: 'cancelled' }`.
- **Rationale**: Centralizing cancellation in a `SECURITY DEFINER` RPC enforces Principle V (Server Authority) and Principle VI (Atomic Concurrency). Setting the transaction GUC allows downstream triggers (`enqueue_order_notification`) to inspect the actor without altering table schemas.
- **Alternatives Considered**:
  - *Allow direct client UPDATE via RLS*: Rejected because client updates cannot reliably coordinate driver capacity clearing and cannot set transaction-scoped GUCs for actor-aware notification suppression.
  - *Clear `orders.driver_id` to NULL on cancellation*: Rejected because clearing `driver_id` would prevent the assigned driver from reading the cancelled order via `orders_customer_or_driver_select` RLS, preventing real-time update delivery to the driver's device and breaking auditability.

---

### Decision 3: Reopening Database Lifecycle Transitions (`validate_order_transition`) & Parity

- **Context**: In Feature 003, `validate_order_transition` was hardened to close driver cancellation loopholes, allowing cancellation only from `pending`. Feature 005 deliberately permits customer cancellation from `accepted`, `preparing`, and `out_for_delivery` (FR-001a, FR-001b, FR-001c). In addition, `pending -> expired` must be permitted.
- **Decision**:
  1. Amend `validate_order_transition()` trigger function:
     ```sql
     IF NEW.status IS DISTINCT FROM OLD.status THEN
       IF NOT (
            (OLD.status = 'pending'          AND NEW.status IN ('accepted', 'cancelled', 'rejected', 'expired'))
         OR (OLD.status = 'accepted'         AND NEW.status IN ('preparing', 'cancelled'))
         OR (OLD.status = 'preparing'        AND NEW.status IN ('out_for_delivery', 'cancelled'))
         OR (OLD.status = 'out_for_delivery' AND NEW.status IN ('delivered', 'cancelled'))
       ) THEN
         RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status
           USING ERRCODE = '23514',
                 HINT = 'Valid transitions are defined in OrderStatus.ts and must match this trigger. Cancelled is reachable from pending, accepted, preparing, out_for_delivery via customer cancel.';
       END IF;
     END IF;
     ```
  2. Maintain 1:1 strict parity in client `src/features/orders/domain/entities/OrderStatus.ts`:
     - Add `OrderStatus.Expired = 'expired'`.
     - Update `VALID_TRANSITIONS` map:
       - `[OrderStatus.Pending]: [OrderStatus.Accepted, OrderStatus.Cancelled, OrderStatus.Rejected, OrderStatus.Expired]`
       - `[OrderStatus.Accepted]: [OrderStatus.Preparing, OrderStatus.Cancelled]`
       - `[OrderStatus.Preparing]: [OrderStatus.OutForDelivery, OrderStatus.Cancelled]`
       - `[OrderStatus.OutForDelivery]: [OrderStatus.Delivered, OrderStatus.Cancelled]`
       - `[OrderStatus.Delivered]: []`
       - `[OrderStatus.Cancelled]: []`
       - `[OrderStatus.Rejected]: []`
       - `[OrderStatus.Expired]: []`
- **Rationale**: Reopening these edges in the trigger is safe because client direct UPDATE access to `orders.status` is completely blocked; transitions into `cancelled` from active states can only be executed via the `cancel_order` RPC which strictly verifies `customer_id = auth.uid()`.
- **Alternatives Considered**:
  - *Bypass `validate_order_transition` using `app.order_maintenance = 'on'` in `cancel_order`*: Rejected because keeping the transitions explicit inside `validate_order_transition` documents the allowed state machine in the schema and maintains parity with `OrderStatus.ts`.

---

### Decision 4: Expiration Threshold, Background Cron, and Atomic Claim Guard

- **Context**: Pending unclaimed orders must expire after 30 minutes (FR-007). Order age must be measured by server `created_at` against server `now()` (FR-008). The 30-minute rule must be enforced in a single source of truth across background jobs, claim attempts, and pool queries (FR-009, FR-010, FR-011).
- **Decision**:
  1. Define TTL function as the single source of truth:
     ```sql
     CREATE OR REPLACE FUNCTION public.pending_order_ttl()
     RETURNS INTERVAL
     LANGUAGE sql
     IMMUTABLE
     AS $$ SELECT INTERVAL '30 minutes'; $$;
     ```
  2. Create background expiration RPC `public.expire_stale_orders() RETURNS JSONB`:
     - Finds all orders where `status = 'pending' AND created_at < (now() - public.pending_order_ttl())`.
     - Atomically updates their status to `'expired'`.
     - Triggers `emit_driver_pool_signal` and `enqueue_order_notification` automatically.
  3. Schedule recurring job via `pg_cron`:
     - Run every minute: `SELECT cron.schedule('expire_stale_orders_job', '* * * * *', 'SELECT public.expire_stale_orders();');`
     - Wrapped in conditional extension existence check so migrations succeed in environments without `pg_cron`.
  4. Race Protection in `claim_order(p_order_id UUID, p_driver_id UUID)`:
     - Amend the atomic update to include TTL verification:
       ```sql
       UPDATE public.orders
          SET driver_id   = p_driver_id,
              status      = 'accepted',
              accepted_at = now(),
              updated_at  = now()
        WHERE id = p_order_id
          AND status = 'pending'
          AND driver_id IS NULL
          AND created_at >= (now() - public.pending_order_ttl())
       RETURNING * INTO v_order;
       ```
     - If the order has exceeded 30 minutes, 0 rows are updated, `FOUND` is false, and the RPC returns `{ claimed: false, order: null }`.
  5. Pool Filtering in `get_available_orders()`:
     - Add `AND o.created_at >= (now() - public.pending_order_ttl())` to the query predicate so stale orders disappear even if the cron job has not yet run.
  6. Realtime Pool Signal Extension in `emit_driver_pool_signal()`:
     - Update condition:
       ```sql
       IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'cancelled', 'rejected', 'expired') THEN
         INSERT INTO public.driver_pool_signals (order_id, signal) VALUES (NEW.id, 'order_claimed');
         DELETE FROM public.driver_pool_signals WHERE order_id = NEW.id;
       ```
     - This immediately broadcasts to connected drivers that the order has exited the available pool.
- **Rationale**: Guarantees zero phantom claims (SC-002, SC-005) even during background worker downtime, network delays, or high-concurrency claim races.
- **Alternatives Considered**:
  - *Client-side expiration timers*: Rejected. Violates Principle V (Server Authority) and is subject to device clock skew.
  - *Database row TTL / pg_timetable*: `pg_cron` is the standard Supabase extension; adding the live check inside `claim_order` guarantees immediate consistency without relying strictly on cron timeliness.

---

### Decision 5: Actor-Aware Notifications & Push Routing

- **Context**: When a customer cancels an order:
  - If a driver was assigned (`driver_id IS NOT NULL`), dispatch `order_cancelled_by_customer` push notification to the driver (FR-017).
  - Suppress customer-facing cancellation push notification to prevent confusing self-echo (FR-018, SC-004).
  - If an unclaimed pending order expires, dispatch `order_expired` push notification to the customer (FR-019).
  - If cancellation was initiated by a non-customer actor (future admin/system), dispatch standard `order_cancelled` to customer.
- **Decision**:
  1. Alter `public.notification_events` check constraint to include `'order_cancelled_by_customer'` and `'order_expired'`:
     ```sql
     ALTER TABLE public.notification_events DROP CONSTRAINT IF EXISTS notification_events_event_type_check;
     ALTER TABLE public.notification_events ADD CONSTRAINT notification_events_event_type_check
       CHECK (event_type IN (
         'new_order_pool', 'order_accepted', 'order_preparing',
         'order_out_for_delivery', 'order_delivered', 'order_cancelled',
         'order_released', 'order_cancelled_by_customer', 'order_expired'
       ));
     ```
  2. Update `enqueue_order_notification()` trigger:
     - When `NEW.status = 'cancelled'`:
       - If `coalesce(current_setting('app.cancellation_actor', true), '') = 'customer'`:
         - Suppress customer push alert.
         - If `NEW.driver_id IS NOT NULL`:
           ```sql
           INSERT INTO public.notification_events
             (event_type, order_id, target_role, title, body, deep_link_url, dedupe_key)
           VALUES (
             'order_cancelled_by_customer', NEW.id, 'driver',
             'Order cancelled',
             'The customer cancelled your order from ' || NEW.restaurant_name,
             '/(driver)/available-orders',
             NEW.id || ':order_cancelled_by_customer:' || NEW.event_seq
           ) ON CONFLICT (dedupe_key) DO NOTHING;
           ```
       - Else (`app.cancellation_actor != 'customer'`):
         - Emit standard `order_cancelled` for `customer`.
     - When `NEW.status = 'expired'`:
       ```sql
       INSERT INTO public.notification_events
         (event_type, order_id, target_role, title, body, deep_link_url, dedupe_key)
       VALUES (
         'order_expired', NEW.id, 'customer',
         'Order expired',
         'Your order from ' || NEW.restaurant_name || ' expired as no driver was available',
         '/(customer)/orders/' || NEW.id,
         NEW.id || ':order_expired:' || NEW.event_seq
       ) ON CONFLICT (dedupe_key) DO NOTHING;
       ```
  3. Update Edge Function `notify-order-status`:
     - Select `driver_id` in order query: `.select('id, customer_id, driver_id, restaurant_id, restaurant_name, total_amount')`.
     - When `event.target_role === 'driver'`:
       - If `event.event_type === 'order_cancelled_by_customer'`:
         - Resolve tokens ONLY for the single assigned driver (`user_id = order.driver_id`), rather than broadcasting to all available pool drivers.
         - Apply locale-aware copy:
           - English: Title: `"Order cancelled"`, Body: `"The customer cancelled your order from ${storeName}"`
           - Arabic: Title: `"تم إلغاء الطلب"`, Body: `"قام العميل بإلغاء طلبك من ${storeName}"`
       - If `event.event_type === 'new_order_pool'`:
         - Retain existing broadcast to all available pool drivers.
     - When `event.target_role === 'customer'`:
       - Add `order_expired` to `customerCopy`:
         - English: Title: `"Order expired"`, Body: `"Your order from ${storeName} expired as no driver was available"`
         - Arabic: Title: `"انتهت صلاحية الطلب"`, Body: `"انتهت صلاحية طلبك من ${storeName} لعدم توفر سائق"`
  4. Update `NotificationEventType.ts`: Add `OrderCancelledByCustomer` and `OrderExpired`.
- **Rationale**: Reuses the hardened webhook notification pipeline (Feature 004) with strict deduplication (`order_id:event_type:event_seq`). Ensures zero self-echoes for customers while delivering targeted, PII-free cancellation notices to drivers.
- **Alternatives Considered**:
  - *Direct Expo API calls in Postgres triggers*: Violates separation of concerns and could block database transactions on network I/O.

---

### Decision 6: Order History Soft-Hiding Architecture

- **Context**: Customers want to remove orders from their order history list without affecting database audit trails, snapshots, or financial reporting (FR-022, FR-023, FR-024, FR-025, SC-007).
- **Decision**:
  1. Add column to `public.orders`:
     ```sql
     ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_hidden_at TIMESTAMPTZ DEFAULT NULL;
     CREATE INDEX IF NOT EXISTS idx_orders_customer_hidden ON public.orders(customer_id, customer_hidden_at) WHERE customer_hidden_at IS NULL;
     ```
  2. Implement `public.hide_order(p_order_id UUID) RETURNS JSONB` (`SECURITY DEFINER`):
     - Authenticate caller: `auth.uid() IS NOT NULL`.
     - Verify ownership: `customer_id = auth.uid()`.
     - Update: `UPDATE public.orders SET customer_hidden_at = now(), updated_at = now() WHERE id = p_order_id AND customer_id = auth.uid();`
     - Column guard compatibility: Note that `orders_column_guard` does not check `customer_hidden_at`, so standard updates proceed without error.
  3. Filter customer order queries in `SupabaseOrderRepository.getCustomerOrders(customerId)`:
     ```ts
     .from('orders')
     .select('*')
     .eq('customer_id', customerId)
     .is('customer_hidden_at', null)
     .order('created_at', { ascending: false });
     ```
  4. Deep Link / Reorder Preservation:
     - `getOrderById(orderId)` does NOT filter on `customer_hidden_at`, allowing customers to view past order details via deep links and perform "Order Again".
- **Rationale**: Satisfies regulatory and financial compliance (Principle VII) by never physically deleting historical orders while granting customers full privacy control over their visible history list.
- **Alternatives Considered**:
  - *Physical row deletion*: Strictly rejected. Violates Principle VII and corrupts driver history and restaurant analytics.
  - *Client-side filtering stored in AsyncStorage*: Rejected. Does not sync across devices and is lost upon clearing app data or re-logging in.

---

### Decision 7: Reorder ("Order Again") Workflow & Catalog Revalidation

- **Context**: Customers viewing past terminal orders (expired, cancelled, delivered) can reorder using an "Order Again" action (FR-026, FR-027, FR-028). The reorder must revalidate catalog availability and prices, respect single-store cart rules, and require explicit checkout confirmation.
- **Decision**:
  1. Implement application hook `useReorder` in `src/features/orders/application/hooks/useReorder.ts`:
     - Input: historical `Order` entity.
     - Fetches live store details via `StoreRepository.getStoreById(order.storeId)` to verify store is active.
     - Fetches live products and add-ons via `ProductRepository.getProductsByStore(order.storeId)`.
     - Compares historical snapshot items against live catalog:
       - Match `productId`: check if active and available.
       - Match add-ons: check if add-on still exists on the product and is available.
       - Recompute prices using current live `unitPrice` and add-on prices.
       - Discard or flag items/add-ons that no longer exist or are inactive.
       - If any items were dropped or adjusted, prepare user notification ("Some items are no longer available and were removed").
  2. Single-Store Cart Conflict Handling:
     - Checks current Redux cart `storeId`.
     - If current cart is empty or same store: add items to cart.
     - If current cart contains items from a different store:
       - Extend `cartSlice` to support batch conflict staging: `setConflictBatchPrompt({ storeId, storeName, items })`.
       - Render existing `StoreConflictModal` to ask customer: "Your cart contains items from another store. Replace them with items from {storeName}?".
       - On confirmation: `clearAndSetItems({ storeId, storeName, items })`.
  3. Explicit Checkout:
     - After cart is staged, navigate user to `/(customer)/checkout`.
     - Order is NOT placed automatically. Customer reviews live subtotal, address, and confirms placement.
- **Rationale**: Strictly preserves Principle V (prices recomputed from current catalog) and Principle VII (historical orders remain immutable snapshots), while honoring the single-store cart constraint.
- **Alternatives Considered**:
  - *Direct order creation from historical order*: Strictly rejected (FR-027). Would allow purchasing outdated products or circumventing price changes.

---

### Decision 8: Driver Concurrency & Status Advance Race Handling

- **Context**: In high-concurrency mobile environments, a customer might cancel an order at the exact moment a driver taps "Advance Status" (User Story 7, FR-016). Previously, the driver update could trigger `validate_order_transition` exception `cancelled -> preparing` (error code 23514), surfacing an unhandled error dialog.
- **Decision**:
  1. Harden `advance_order_status(p_order_id UUID)`:
     ```sql
     -- Select current status
     SELECT status INTO v_current_status
       FROM public.orders
      WHERE id = p_order_id AND driver_id = auth.uid();

     IF NOT FOUND THEN
       RAISE EXCEPTION 'ORDER_NOT_FOUND_OR_NOT_ASSIGNED' USING ERRCODE = 'P0002';
     END IF;

     -- Determine next status as before...

     -- Atomic conditional UPDATE with current status guard
     UPDATE public.orders
        SET status       = v_next_status,
            delivered_at = CASE WHEN v_next_status = 'delivered' THEN now() ELSE delivered_at END,
            updated_at   = now()
      WHERE id = p_order_id
        AND driver_id = auth.uid()
        AND status = v_current_status;

     IF NOT FOUND THEN
       -- Interleaved cancellation occurred; return graceful failure
       RETURN jsonb_build_object(
         'success', false,
         'order_id', p_order_id,
         'error', 'ORDER_STATUS_CHANGED',
         'message', 'Order is no longer in expected state'
       );
     END IF;

     -- If delivered, clear driver active delivery slot
     IF v_next_status = 'delivered' THEN
       UPDATE public.driver_profiles
          SET current_order_id = NULL,
              updated_at = now()
        WHERE user_id = auth.uid();
     END IF;

     RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'new_status', v_next_status);
     ```
  2. Driver App Presentation:
     - `ActiveOrderCard` detects if `activeOrder.status === 'cancelled'`.
     - When cancelled:
       - Displays prominent alert banner: `"Customer cancelled this order"`.
       - Hides/disables status advance buttons.
       - Displays a `"Return to Available Orders"` action button.
       - When tapped, invalidates `ACTIVE_ORDER_QUERY_KEY` and navigates back to `/(driver)/available-orders`.
- **Rationale**: Prevents unhandled database trigger exceptions (SC-009) and gives the driver a clean, professional UX transition when cancellations occur.
- **Alternatives Considered**:
  - *Let the database throw error 23514 and catch it in TypeScript*: Messy error message string parsing and risks masking actual bugs. Handling it conditionally inside the SQL RPC is clean and robust.

---

## Conclusion & Readiness

All unknowns and technical questions are resolved. The design directly satisfies all functional requirements and architectural principles. Proceed to Phase 1: Design & Contracts.
