## Completion Report                                                                                                                         
                                                                                                                                               
  The feature specification for Order Cancellation & Expiration has been created and validated against all Spec Kit quality criteria and       
  project requirements.                                                                                                                        
                                                                                                                                               
  • Feature Directory: 005-order-cancellation-expiration                                                                                       
  • Specification File: spec.md                                                                                                                
  • Quality Checklist: requirements.md                                                                                                         
  • Active Feature Configuration: Updated feature.json to point to specs/005-order-cancellation-expiration.                                    
  • Checklist Results: 16/16 Passed (0 failures, 0 [NEEDS CLARIFICATION] markers remaining).                                                   
  ──────                                                                                                                                       
  ## Detailed Inspection & Architectural Assessment                                                                                            
                                                                                                                                               
  Following the instructions in update-sari3.md, the existing codebase, database migrations, RPCs, realtime signals, notification pipeline, and
  client components were inspected live. Below is the comprehensive report across all 10 requested areas:                                      
                                                                                                                                               
  ### 1. Files & Specifications Inspected                                                                                                      
                                                                                                                                               
  • Specifications & Governance:                                                                                                               
      • constitution.md — Verified Principles II, III, IV, V, VI, VII, VIII, and X.                                                            
      • spec.md — Reviewed driver availability, claiming mechanics, and release flows.                                                         
      • spec.md — Reviewed notification events, triggers, deduplication key, and locale copy.                                                  
      • update-sari3.md — Complete requirements and design resolutions.                                                                        
  • Database Migrations & Triggers:                                                                                                            
      • 20260916000004_rls_policies.sql — Inspected initial order RLS policies.                                                                
      • 20260919000010_order_transition_hardening.sql — Inspected validate_order_transition() and orders_column_guard().                       
      • 20260919000012_claim_order_found_fix.sql — Inspected atomic claim_order() implementation.                                              
      • 20260920000002_driver_fulfillment_rpcs.sql — Inspected get_available_orders(), advance_order_status(), and release_order().            
      • 20260922000002_driver_pool_signals.sql — Confirmed emit_driver_pool_signal() already catches cancelled on pool exit.                   
      • 20260923000002_create_notification_events.sql & 20260923000003_create_order_notification_trigger.sql — Inspected                       
      enqueue_order_notification() and event_seq.                                                                                              
      • index.ts — Inspected Edge Function recipient resolution and dispatch logic.                                                            
  • Application & Presentation Code:                                                                                                           
      • OrderStatus.ts & Order.ts                                                                                                              
      • SupabaseOrderRepository.ts                                                                                                             
      • SupabaseDriverFulfillmentRepository.ts                                                                                                 
      • SupabaseDriverRealtimeService.ts                                                                                                       
      • useActiveOrder.ts & (driver/active-order.tsx)                                                                                          
      • StoreConflictModal.tsx                                                                                                                 
      • (customer/orders/index.tsx) & src/app/(customer)/orders/[id].tsx file:///home/youssef/Desktop/sari3-                                   
      app/sari3_speckit/sari3_app2/src/app/(customer)/orders/[id].tsx                                                                          
                                                                                                                                               
  ──────                                                                                                                                       
  ### 2. Business Rules Added / Changed                                                                                                        
                                                                                                                                               
  1. Customer Order Cancellation Scope:                                                                                                        
      • Allowed from: pending, accepted, preparing, and out_for_delivery (deliberate product decision).                                        
      • Denied from: delivered, cancelled, and expired.                                                                                        
  2. Cancellation Authority:                                                                                                                   
      • Reopened transition edges (accepted → cancelled, preparing → cancelled, out_for_delivery → cancelled) are safe because only the        
      verified-ownership cancel_order() RPC may trigger them.                                                                                  
      • Driver cancel loophole remains closed: drivers cannot cancel orders, only release them.                                                
  3. Driver Capacity Auto-Release on Cancellation:                                                                                             
      • When a customer cancels an order with an assigned driver, the driver's active delivery assignment is cleared immediately, freeing them 
      to claim other orders.                                                                                                                   
  4. Order Expiration Policy:                                                                                                                  
      • Unclaimed pending orders expire after 30 minutes.                                                                                      
      • Calculated strictly via server now() - created_at (never device time).                                                                 
      • Single source of truth interval: defined via public.pending_order_ttl().                                                               
  5. Customer Experience for Stale / Expired Orders ("Order Again"):                                                                           
      • Displays "Expired" status badge.                                                                                                       
      • "Order Again" repopulates the cart from historical snapshots, revalidates availability and prices against the live catalog, triggers   
      StoreConflictModal if the cart has items from another store, and requires explicit checkout confirmation. Never auto-creates orders.     
  6. Customer Order History Hiding:                                                                                                            
      • Soft-hiding via customer_hidden_at = now().                                                                                            
      • Never physically deletes records, preserving immutable snapshots and audit logs.                                                       
      • Scoped strictly to the order owner.                                                                                                    
  7. Race Condition Resilience:                                                                                                                
      • claim_order validates age < TTL live.                                                                                                  
      • advance_order_status checks AND status = v_current_status to fail cleanly if cancelled concurrently.                                   
                                                                                                                                               
  ──────                                                                                                                                       
  ### 3. Database / Schema Changes Required                                                                                                    
                                                                                                                                               
  1. order_status Enum Addition (Two-Migration Sequence):                                                                                      
      • Postgres restriction requires ALTER TYPE order_status ADD VALUE 'expired' to commit in its own transaction before the value can be     
      referenced in functions, views, or triggers.                                                                                             
  2. orders Table:                                                                                                                             
      • Add column customer_hidden_at TIMESTAMPTZ NULL DEFAULT NULL.                                                                           
      • Note: cancel_order() only modifies status and updated_at, both already permitted by orders_column_guard. No new cancelled_at column is 
      added.                                                                                                                                   
  3. Single Source of Truth for Expiration TTL:                                                                                                
      • Create SQL function:                                                                                                                   
        CREATE OR REPLACE FUNCTION public.pending_order_ttl()                                                                                  
        RETURNS interval                                                                                                                       
        LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$                                                                                             
          SELECT interval '30 minutes';                                                                                                        
        $$;                                                                                                                                    
                                                                                                                                               
  4. orders_column_guard Trigger:                                                                                                              
      • Remains strictly intact; customer_hidden_at is mutated solely through the dedicated hide_order() RPC.                                  
  5. Scheduled Background Expiration (pg_cron):                                                                                                
      • Enable extension: CREATE EXTENSION IF NOT EXISTS pg_cron;                                                                              
      • Schedule recurring cron job: cron.schedule('expire-stale-pending-orders', '*/1 * * * *', 'SELECT public.expire_stale_pending_orders(); 
      ').                                                                                                                                      
                                                                                                                                               
  ──────                                                                                                                                       
  ### 4. RPC Changes Required                                                                                                                  
                                                                                                                                               
  1. cancel_order(p_order_id UUID) (NEW, SECURITY DEFINER):                                                                                    
      • Authenticates caller and verifies customer_id = auth.uid().                                                                            
      • Rejects if status is delivered, cancelled, or expired.                                                                                 
      • Sets transaction-scoped actor GUC: PERFORM set_config('app.cancellation_actor', 'customer', true);.                                    
      • Updates order: SET status = 'cancelled', updated_at = now() WHERE id = p_order_id.                                                     
      • If an assigned driver exists, clears driver_profiles.current_order_id for that driver.                                                 
      • Returns { "success": true, "status": "cancelled" }.                                                                                    
  2. hide_order(p_order_id UUID) (NEW, SECURITY DEFINER):                                                                                      
      • Authenticates caller and verifies customer_id = auth.uid().                                                                            
      • Updates order: SET customer_hidden_at = now() WHERE id = p_order_id.                                                                   
      • Returns { "success": true }.                                                                                                           
  3. expire_stale_pending_orders() (NEW, SECURITY DEFINER):                                                                                    
      • Executes atomic conditional update:                                                                                                    
        UPDATE public.orders                                                                                                                   
           SET status = 'expired', updated_at = now()                                                                                          
         WHERE status = 'pending'                                                                                                              
           AND created_at < now() - public.pending_order_ttl();                                                                                
                                                                                                                                               
  4. claim_order(p_order_id UUID, p_driver_id UUID) (EXTENDED):                                                                                
      • Extends the atomic conditional UPDATE WHERE clause to verify order age against the single source of truth:                             
        WHERE id = p_order_id                                                                                                                  
          AND status = 'pending'                                                                                                               
          AND driver_id IS NULL                                                                                                                
          AND created_at >= now() - public.pending_order_ttl()                                                                                 
                                                                                                                                               
  5. advance_order_status(p_order_id UUID) (WIDENED):                                                                                          
      • Widens the UPDATE WHERE clause from WHERE id = p_order_id to:                                                                          
        WHERE id = p_order_id AND status = v_current_status;                                                                                   
                                                                                                                                               
      • If zero rows are updated (due to concurrent cancellation), returns a handled result or raises a distinct error code                    
      (ORDER_NO_LONGER_ACTIVE) rather than triggering an unhandled database exception dialog.                                                  
  6. get_available_orders() (EXTENDED):                                                                                                        
      • Appends safety boundary: AND o.created_at >= now() - public.pending_order_ttl().                                                       
                                                                                                                                               
  ──────                                                                                                                                       
  ### 5. Realtime Changes Required                                                                                                             
                                                                                                                                               
  1. emit_driver_pool_signal() Trigger:                                                                                                        
      • Live inspection confirmed line 57 already has NEW.status IN ('accepted', 'cancelled', 'rejected') firing pool-exit signals.            
      • Simply extend the condition to include 'expired':                                                                                      
        IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'cancelled', 'rejected', 'expired') THEN                                      
                                                                                                                                               
      • No separate realtime channel or infrastructure needed!                                                                                 
  2. Driver Active Order Realtime Subscription:                                                                                                
      • Drivers already subscribe to postgres_changes UPDATE events on orders for their active orderId.                                        
      • RLS policy orders_customer_or_driver_select preserves driver read access even when cancelled because driver_id remains assigned.       
      • The driver UI immediately receives status = 'cancelled', displays "Customer cancelled this order", and clears active controls.         
                                                                                                                                               
  ──────                                                                                                                                       
  ### 6. Notification Changes Required                                                                                                         
                                                                                                                                               
  1. notification_events Table:                                                                                                                
      • Update event_type CHECK constraint to include 'order_cancelled_by_customer' and 'order_expired'.                                       
  2. enqueue_order_notification() Trigger Function:                                                                                            
      • Check transaction-scoped actor GUC: coalesce(current_setting('app.cancellation_actor', true), '').                                     
      • When transitioning into cancelled:                                                                                                     
          • If actor is 'customer', suppress the customer self-echo alert.                                                                     
          • If assigned driver exists (NEW.driver_id IS NOT NULL), generate a driver-facing event: order_cancelled_by_customer.                
      • When transitioning into expired:                                                                                                       
          • Generate a customer-facing event: order_expired.                                                                                   
      • Reuses existing deduplication key format: order_id:event_type:event_seq.                                                               
  3. Supabase Edge Function (notify-order-status):                                                                                             
      • Add localized Arabic and English notification copy for:                                                                                
          • order_cancelled_by_customer: "Order cancelled by customer" / "قام العميل بإلغاء الطلب".                                            
          • order_expired: "Order expired" / "انتهت صلاحية الطلب".                                                                             
      • Support driver recipient routing for order_cancelled_by_customer targeting only order.driver_id (rather than the entire driver pool).  
                                                                                                                                               
  ──────                                                                                                                                       
  ### 7. RLS / Security Changes Required                                                                                                       
                                                                                                                                               
  1. Consolidation of Customer Cancellation:                                                                                                   
      • Drop orders_update_own_customer_cancel if existing:                                                                                    
        DROP POLICY IF EXISTS orders_update_own_customer_cancel ON public.orders;                                                              
                                                                                                                                               
      • All customer cancellations must route exclusively through cancel_order().                                                              
  2. Customer Order History Hiding:                                                                                                            
      • Direct column writes to customer_hidden_at remain blocked by orders_column_guard.                                                      
      • Hiding routes exclusively through the SECURITY DEFINER hide_order() RPC, enforcing customer_id = auth.uid().                           
  3. Execution Grants:                                                                                                                         
      • REVOKE ALL ON FUNCTION public.cancel_order, public.hide_order FROM PUBLIC, anon;                                                       
      • GRANT EXECUTE ON FUNCTION public.cancel_order, public.hide_order TO authenticated, service_role;                                       
                                                                                                                                               
  ──────                                                                                                                                       
  ### 8. tasks.md Preparation & Scope Breakdown                                                                                                
                                                                                                                                               
  The upcoming planning and tasks breakdown will be organized into:                                                                            
                                                                                                                                               
  • Phase 1: Database Foundation & Enum Sequencing (Migrations A & B, TTL helper, column addition, trigger updates).                           
  • Phase 2: RPCs & Concurrency Hardening (cancel_order, hide_order, expire_stale_pending_orders, extended claim_order, widened                
  advance_order_status).                                                                                                                       
  • Phase 3: Background Scheduler & Realtime (pg_cron activation, schedule setup, driver_pool_signals update).                                 
  • Phase 4: Notification Pipeline (Trigger GUC check, order_cancelled_by_customer, order_expired, Edge Function copy).                        
  • Phase 5: Domain & Infrastructure Layers (OrderStatus enum, OrderRepository, DriverFulfillmentRepository, query updates).                   
  • Phase 6: Presentation Layer (Customer cancel button, "Expired" badges, "Order Again" cart rehydration + conflict handling, active driver   
  cancellation alert).                                                                                                                         
  • Phase 7: End-to-End Testing & Concurrency Validation (15 acceptance scenarios, boundary claim race test, RLS audit).                       
  ──────                                                                                                                                       
  ### 9. Database Migrations in Exact Required Sequence                                                                                        
                                                                                                                                               
  • Migration 1 (20260925000000_add_order_status_expired.sql):                                                                                 
    ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'expired';                                                                          
                                                                                                                                               
  • Migration 2 (20260925000001_order_lifecycle_schema_and_triggers.sql):                                                                      
      • Add customer_hidden_at to public.orders.                                                                                               
      • Add public.pending_order_ttl() SQL helper function.                                                                                    
      • Re-issue validate_order_transition() with pending -> expired and accepted/preparing/out_for_delivery -> cancelled.                     
      • Update emit_driver_pool_signal() to include expired.                                                                                   
      • Execute DROP POLICY IF EXISTS orders_update_own_customer_cancel ON public.orders;.                                                     
  • Migration 3 (20260925000002_cancellation_and_expiration_rpcs.sql):                                                                         
      • Create cancel_order(order_id UUID) with app.cancellation_actor GUC.                                                                    
      • Create hide_order(order_id UUID).                                                                                                      
      • Create expire_stale_pending_orders().                                                                                                  
      • Update claim_order() with age check against pending_order_ttl().
      • Update advance_order_status() with widened WHERE clause (AND status = v_current_status).
      • Update get_available_orders() with age filter against pending_order_ttl().
  • Migration 4 (20260925000003_notification_events_cancellation_expiration.sql):
      • Update notification_events.event_type check constraint.
      • Update enqueue_order_notification() trigger with actor-aware GUC check for self-echo suppression and order_cancelled_by_customer /     
      order_expired dispatches.
  • Migration 5 (20260925000004_setup_pg_cron_expiration_job.sql):
      • CREATE EXTENSION IF NOT EXISTS pg_cron;
      • Schedule expire_stale_pending_orders() every 1 minute.
  
  ──────
  ### 10. Unresolved Design Decisions
  
  None. All major design decisions were fully resolved, verified against the existing architecture, and codified in spec.md.
  ──────
  ## Next Steps
  
  The specification phase is complete. You can proceed with planning the implementation by running:
  
    /speckit-plan
