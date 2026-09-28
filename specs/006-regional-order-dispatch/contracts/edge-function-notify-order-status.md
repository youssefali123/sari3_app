# Contract: Edge Function `notify-order-status`

**Feature**: `006-regional-order-dispatch`  
**Location**: `supabase/functions/notify-order-status/index.ts`  
**Trigger**: Invoked via database webhook/trigger on `notification_events` inserts

---

## 1. Event Type & Triggering Flow

When an order is created with status `pending`, a notification event of type `order_created` is inserted into `public.notification_events`.
The edge function evaluates the event, identifies target users, and sends Expo push notifications.

---

## 2. Driver Notification Query Modification (Step 4b)

### Previous Flow:
1. Fetch all user IDs where `profiles.role = 'driver'`.
2. Filter for drivers where `driver_profiles.is_available = true`.
3. Exclude drivers holding active deliveries (`orders.status IN ('accepted', 'preparing', 'out_for_delivery')`).
4. Dispatch push notifications to device tokens of all remaining available drivers.

### New Flow with Regional Scoping:
1. Fetch order details including `restaurant_id`.
2. Fetch `restaurant.area_id` and `restaurant.address` from `public.restaurants`.
3. If `restaurant.area_id` is null or missing: throw an error / abort driver dispatch (prevents untagged broadcast).
4. Fetch driver IDs assigned to that specific area:
   ```typescript
   const { data: areaDrivers, error: areaErr } = await admin
     .from('driver_areas')
     .select('driver_id')
     .eq('area_id', restaurant.area_id);
   if (areaErr) throw new Error(areaErr.message);
   const assignedDriverIds = (areaDrivers ?? []).map((ad) => ad.driver_id);
   ```
5. If `assignedDriverIds.length === 0`:
   - Mark event dispatched with note `no_assigned_drivers_in_area`.
   - Return cleanly without attempting device token queries.
6. Intersect `assignedDriverIds` with the pool of available, unbusy drivers:
   - Must have role `driver`.
   - Must be in `assignedDriverIds`.
   - Must have `is_available = true`.
   - Must not have active deliveries.
7. Query `public.device_push_tokens` for the final filtered list of driver IDs.
8. Deliver push notifications only to these tokens.

---

## 3. Guarantees & Constraints

- **Leakage Prevention**: Drivers assigned to Area B will receive 0 push notifications for orders placed in Area A.
- **Payload Sanitization**: Notifications carry store name, pickup zone (address), total amount, and order ID. No customer PII is included in the push payload.
