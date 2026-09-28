# Contract: `get_available_orders()` Stored Procedure

**Feature**: `006-regional-order-dispatch`  
**Endpoint**: PostgreSQL RPC `public.get_available_orders()`  
**Call Method**: Supabase JS `.rpc('get_available_orders')`  
**Security**: `SECURITY DEFINER`, `STABLE`

---

## 1. Interface Signature

```sql
FUNCTION public.get_available_orders() RETURNS JSONB
```

- **Arguments**: None (reads calling context via `auth.uid()`).
- **Return Type**: `JSONB` array of available order preview objects.

---

## 2. Authorization & Gate Checks

| Order | Check | Condition | Failure Outcome |
|---|---|---|---|
| 1 | Authentication | `auth.uid() IS NULL` | `RAISE EXCEPTION 'NOT_AUTHENTICATED' USING ERRCODE = '42501'` |
| 2 | Driver Role | `NOT app_private.has_role('driver')` | `RAISE EXCEPTION 'ONLY_DRIVERS_CAN_VIEW_ORDER_POOL' USING ERRCODE = '42501'` |
| 3 | Driver Available | `NOT EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = auth.uid() AND is_available = true)` | Returns `'[]'::jsonb` |
| 4 | Active Delivery Guard | `EXISTS (SELECT 1 FROM orders WHERE driver_id = auth.uid() AND status IN ('accepted', 'preparing', 'out_for_delivery'))` | Returns `'[]'::jsonb` |
| 5 | Regional Scope / Safe-Default-Deny | Evaluated in query: `AND EXISTS (SELECT 1 FROM driver_areas da WHERE da.driver_id = auth.uid() AND da.area_id = r.area_id)` | Orders outside assigned areas excluded; if driver has 0 areas, returns `'[]'::jsonb` |

---

## 3. Query Filter Specification

```sql
SELECT coalesce(
         jsonb_agg(
           jsonb_build_object(
             'id', o.id,
             'storeName', o.restaurant_name,
             'storeNeighbourhood', r.address,
             'itemCount', (SELECT COUNT(*)::int FROM public.order_items oi WHERE oi.order_id = o.id),
             'createdAt', o.created_at
           ) ORDER BY o.created_at ASC
         ),
         '[]'::jsonb
       )
  INTO v_pool
  FROM public.orders o
  JOIN public.restaurants r ON r.id = o.restaurant_id
 WHERE o.status = 'pending'
   AND o.driver_id IS NULL
   AND o.created_at >= (now() - pending_order_ttl())
   AND NOT EXISTS (
     SELECT 1 FROM public.driver_order_interactions doi
     WHERE doi.driver_id = auth.uid()
       AND doi.order_id = o.id
       AND doi.interaction_type = 'declined'
   )
   -- New condition for feature 006:
   AND EXISTS (
     SELECT 1 FROM public.driver_areas da
     WHERE da.driver_id = auth.uid()
       AND da.area_id = r.area_id
   );
```

---

## 4. Response Payload Schema

```json
[
  {
    "id": "c1f7a0c0-1111-4234-890a-111111111111",
    "storeName": "Koshary El Tahrir",
    "storeNeighbourhood": "Al Galaa St, Fayoum",
    "itemCount": 3,
    "createdAt": "2026-09-26T04:00:00.000Z"
  }
]
```
