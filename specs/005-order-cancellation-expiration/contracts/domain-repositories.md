# Domain Repositories & Client Interfaces Contract

**Feature**: `005-order-cancellation-expiration`  
**Date**: 2026-09-25  
**Status**: Completed  
**Spec Reference**: [spec.md](../spec.md) | **Data Model**: [data-model.md](../data-model.md)

---

## 1. Orders Feature Domain Contracts

### 1.1 `OrderRepository` (`src/features/orders/domain/repositories/OrderRepository.ts`)

```typescript
import { Order } from '../entities/Order';

export interface PlaceOrderInput {
  storeId: string;
  deliveryAddressId: string;
  paymentMethod: 'cash_on_delivery';
  couponCode?: string | null;
  items: {
    productId: string;
    quantity: number;
    addonIds: string[];
  }[];
}

export interface OrderRepository {
  /**
   * Submit an order intent for atomic server validation and creation.
   */
  placeOrder(input: PlaceOrderInput): Promise<Order>;

  /**
   * Retrieve an order by its unique ID.
   * Does NOT filter on customer_hidden_at, ensuring deep-links and receipts work.
   */
  getOrderById(id: string): Promise<Order>;

  /**
   * Retrieve visible order history for the authenticated customer.
   * Strictly filters out orders where customer_hidden_at is set.
   */
  getCustomerOrders(customerId: string): Promise<Order[]>;

  /**
   * Cancel an order via the server-authoritative cancel_order RPC.
   * Valid for pending, accepted, preparing, and out_for_delivery.
   */
  cancelOrder(orderId: string): Promise<Order>;

  /**
   * Soft-hide an order from the customer's order history via hide_order RPC.
   * Preserves database record, financial totals, and snapshots intact.
   */
  hideOrder(orderId: string): Promise<void>;
}
```

---

## 2. Driver Fulfillment Domain Contracts

### 2.1 `DriverFulfillmentRepository` Update (`src/features/drivers/domain/repositories/DriverFulfillmentRepository.ts`)

```typescript
export interface AdvanceOrderResult {
  success: boolean;
  newStatus?: string;
  error?: string;
  message?: string;
}

export interface DriverFulfillmentRepository {
  toggleAvailability(isAvailable: boolean): Promise<boolean>;
  getAvailability(): Promise<boolean>;
  getAvailableOrders(): Promise<AvailableOrderPreview[]>;
  claimOrder(orderId: string): Promise<ClaimOrderResult>;
  declineOrder(orderId: string): Promise<void>;
  
  /**
   * Advances order along the strict lifecycle stepper.
   * Returns a structured result rather than raising on concurrent cancellation.
   */
  advanceOrderStatus(orderId: string): Promise<AdvanceOrderResult>;
  
  releaseOrder(orderId: string, reason: string): Promise<void>;
  getActiveOrder(): Promise<Order | null>;
  getDeliveryHistory(): Promise<DeliveryHistoryEntry[]>;
}
```

---

## 3. Redux Cart Slice Extension (`src/features/cart/application/cartSlice.ts`)

To support multi-item staging and single-store conflict handling during "Order Again":

```typescript
export interface BatchAddPayload {
  storeId: string;
  storeName: string;
  items: CartItem[];
}

export interface CartConflictState {
  isOpen: boolean;
  pendingItem: AddItemPayload | null;
  pendingBatch: BatchAddPayload | null; // Added in 005
}

// Additional reducers in cartSlice:
{
  /**
   * Atomically clears previous cart and loads batch items (e.g. from Order Again conflict confirm).
   */
  clearAndSetBatch(state, action: PayloadAction<BatchAddPayload>) {
    const { storeId, storeName, items } = action.payload;
    state.storeId = storeId;
    state.storeName = storeName;
    state.items = items;
    state.conflictState = initialState.conflictState;
  },

  /**
   * Opens conflict prompt when a reorder batch originates from a different store.
   */
  setConflictBatchPrompt(state, action: PayloadAction<BatchAddPayload>) {
    state.conflictState = {
      isOpen: true,
      pendingItem: null,
      pendingBatch: action.payload,
    };
  }
}
```

---

## 4. Reorder Application Hook (`src/features/orders/application/hooks/useReorder.ts`)

Encapsulates catalog revalidation, price recomputation, conflict prompting, and checkout routing:

```typescript
export interface ReorderResult {
  success: boolean;
  omittedCount: number;
  message?: string;
}

export interface UseReorderReturn {
  reorder: (order: Order) => Promise<ReorderResult>;
  isReordering: boolean;
}

/**
 * Revalidates snapshot items against the current store menu and stages them into cart.
 */
export function useReorder(): UseReorderReturn;
```

---

## 5. Push Notification Edge Function Contract (`supabase/functions/notify-order-status`)

### Request Webhook Payload

```json
{
  "event_id": "UUID"
}
```

### Recipient Dispatch Logic

| Event Type | Target Role | Recipient Resolution | Notification Payload (EN / AR) |
|---|---|---|---|
| `order_cancelled_by_customer` | `driver` | `device_push_tokens` WHERE `user_id = order.driver_id AND is_active = true` (Single assigned driver only) | EN: "Order cancelled" / "The customer cancelled your order from {restaurant_name}"<br>AR: "تم إلغاء الطلب" / "قام العميل بإلغاء طلبك من {restaurant_name}" |
| `order_expired` | `customer` | `device_push_tokens` WHERE `user_id = order.customer_id AND is_active = true` | EN: "Order expired" / "Your order from {restaurant_name} expired as no driver was available"<br>AR: "انتهت صلاحية الطلب" / "انتهت صلاحية طلبك من {restaurant_name} لعدم توفر سائق" |
| `order_cancelled` | `customer` | `device_push_tokens` WHERE `user_id = order.customer_id AND is_active = true` (Suppressed if `app.cancellation_actor = 'customer'`) | EN: "Order cancelled" / "Your order from {restaurant_name} has been cancelled"<br>AR: "تم إلغاء الطلب" / "تم إلغاء طلبك من {restaurant_name}" |
