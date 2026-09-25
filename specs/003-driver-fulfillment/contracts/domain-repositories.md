# Domain Repositories & Service Contracts: Driver Fulfillment (Amended)

**Feature**: Driver Fulfillment  
**Branch**: `003-driver-fulfillment`  
**Date**: 2026-09-20 (Amended)  
**Status**: Completed

In accordance with Constitution Principle II (Lightweight Clean Architecture per Feature) and Principle III (Fixed Dependency Direction), these interfaces reside purely in the **Domain** layer. They contain only TypeScript types and primitives — no imports from React Native, Expo, Supabase, TanStack Query, or Redux.

---

## 1. Driver Fulfillment Repository (`DriverFulfillmentRepository.ts`)

**Location**: `src/features/drivers/domain/repositories/DriverFulfillmentRepository.ts`

```typescript
import { AvailableOrderPreview } from '../entities/AvailableOrderPreview';
import { DeliveryHistoryEntry } from '../entities/DeliveryHistoryEntry';
import { Order } from '../../../orders/domain/entities/Order';

export interface ClaimOrderResult {
  claimed: boolean;
  order: Order | null;
}

export interface DriverFulfillmentRepository {
  /**
   * Toggle driver availability between Available (true) and Offline (false).
   * Persisted directly to driver_profiles.is_available.
   */
  toggleAvailability(isAvailable: boolean): Promise<boolean>;

  /**
   * Fetch current driver availability status from driver_profiles.
   */
  getAvailability(): Promise<boolean>;

  /**
   * Retrieve real-time list of unclaimed pending orders visible to Available driver.
   * Customer address and phone are omitted. Returns [] if offline.
   */
  getAvailableOrders(): Promise<AvailableOrderPreview[]>;

  /**
   * Atomically claim an available order via the hardened claim_order RPC.
   * Returns { claimed: true, order } if successful, { claimed: false, order: null }
   * if already claimed by another driver.
   * Note: claim_order's p_driver_id = auth.uid() is injected infrastructure-side
   * (SupabaseDriverFulfillmentRepository); the domain contract takes orderId only.
   */
  claimOrder(orderId: string): Promise<ClaimOrderResult>;

  /**
   * Decline an available order. Driver-scoped; does not affect visibility to other drivers.
   */
  declineOrder(orderId: string): Promise<void>;

  /**
   * Advance driver's active order to the next sequential lifecycle state:
   * accepted -> preparing -> out_for_delivery -> delivered.
   */
  advanceOrderStatus(orderId: string): Promise<string>;

  /**
   * Self-report inability to complete active order with mandatory reason.
   * Reverts order to pending pool with driverId = null and clears driver pointer.
   */
  releaseOrder(orderId: string, reason: string): Promise<void>;

  /**
   * Retrieve driver's current active order with full delivery details via direct query,
   * or null if no active order exists.
   */
  getActiveOrder(): Promise<Order | null>;

  /**
   * Retrieve driver's delivery history (completed, declined, released, cancelled) newest-first
   * via the get_driver_history SECURITY DEFINER RPC.
   */
  getDeliveryHistory(): Promise<DeliveryHistoryEntry[]>;
}
```

---

## 2. Driver Realtime Service (`DriverRealtimeService.ts`)

**Location**: `src/features/drivers/domain/services/DriverRealtimeService.ts`

```typescript
import { Unsubscribe } from '../../../../shared/types/common';

export interface DriverRealtimeService {
  /**
   * Subscribe to pending orders pool changes (new order placed, order claimed, order released).
   * Triggers callback when available orders list should be refreshed.
   */
  subscribeToAvailableOrders(onOrdersChanged: () => void): Unsubscribe;

  /**
   * Subscribe to status changes on driver's active order (e.g. cancellation by customer).
   */
  subscribeToActiveOrder(
    orderId: string,
    onStatusChange: (status: string) => void,
  ): Unsubscribe;
}
```

---

## 3. Network Status Service (`NetworkStatusService.ts`)

**Location**: `src/features/drivers/domain/services/NetworkStatusService.ts`

```typescript
import { Unsubscribe } from '../../../../shared/types/common';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

export interface NetworkStatusService {
  /**
   * Check current network connectivity asynchronously.
   */
  getNetworkStatus(): Promise<NetworkStatus>;

  /**
   * Listen for real-time network connectivity changes.
   */
  subscribeToNetworkStatus(
    onStatusChange: (status: NetworkStatus) => void,
  ): Unsubscribe;
}
```
