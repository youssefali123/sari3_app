import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Order } from '@/features/orders/domain/entities/Order';
import {
  AdvanceOrderResult,
  DriverFulfillmentRepository,
} from '../../domain/repositories/DriverFulfillmentRepository';
import { SupabaseDriverFulfillmentRepository } from '../../infrastructure/SupabaseDriverFulfillmentRepository';
import { SupabaseDriverRealtimeService } from '../../infrastructure/SupabaseDriverRealtimeService';
import { DriverRealtimeService } from '../../domain/services/DriverRealtimeService';
import { useNetworkStatus } from './useNetworkStatus';
import { OFFLINE_ABORT_MESSAGE } from './useDriverAvailability';
import { DRIVER_HISTORY_QUERY_KEY } from './useDriverHistory';

const driverFulfillmentRepository: DriverFulfillmentRepository =
  new SupabaseDriverFulfillmentRepository();

const driverRealtimeService: DriverRealtimeService =
  new SupabaseDriverRealtimeService();

export const ACTIVE_ORDER_QUERY_KEY = ['driver', 'activeOrder'] as const;
/** Cache-backed "customer cancelled" notice (feature 005 US3). Cleared on next claim. */
export const CANCELLED_NOTICE_QUERY_KEY = ['driver', 'cancelledNotice'] as const;

export interface CancelledOrderNotice {
  orderId: string;
  storeName: string;
}

/**
 * The driver's current active order (driver_id = caller, status in
 * accepted/preparing/out_for_delivery) with full delivery details, or null.
 * Full address/contact are only reachable after a claim because RLS only
 * exposes assigned orders to the assigned driver.
 */
export function useActiveOrder() {
  const queryClient = useQueryClient();
  const { isConnected } = useNetworkStatus();

  const activeOrderQuery = useQuery({
    queryKey: ACTIVE_ORDER_QUERY_KEY,
    queryFn: () => driverFulfillmentRepository.getActiveOrder(),
    // Safety net alongside the realtime subscription (spec edge case: missed
    // events while backgrounded / poor connectivity). Polls only while an
    // active order exists; foreground returns trigger an immediate refetch.
    refetchInterval: (query) => (query.state.data ? 15000 : false),
  });

  const orderId = activeOrderQuery.data?.id;

  // App foreground: realtime sockets may have dropped while backgrounded and
  // postgres_changes does not replay missed events — refetch on return.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: ACTIVE_ORDER_QUERY_KEY });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  useEffect(() => {
    if (!orderId) return;
    return driverRealtimeService.subscribeToActiveOrder(orderId, () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_ORDER_QUERY_KEY });
    });
  }, [orderId, queryClient]);

  const advanceMutation = useMutation({
    mutationFn: async (targetOrderId: string): Promise<AdvanceOrderResult> => {
      if (!isConnected) {
        throw new Error(OFFLINE_ABORT_MESSAGE);
      }
      return driverFulfillmentRepository.advanceOrderStatus(targetOrderId);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['driver', 'availableOrders'] });
      // Delivered clears the driver slot and lands in history
      if (result.success && result.newStatus === 'delivered') {
        queryClient.invalidateQueries({ queryKey: DRIVER_HISTORY_QUERY_KEY });
      }
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (input: { orderId: string; reason: string }) => {
      if (!isConnected) {
        throw new Error(OFFLINE_ABORT_MESSAGE);
      }
      return driverFulfillmentRepository.releaseOrder(
        input.orderId,
        input.reason,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['driver', 'availableOrders'] });
      queryClient.invalidateQueries({ queryKey: DRIVER_HISTORY_QUERY_KEY });
    },
  });

  return {
    activeOrder: activeOrderQuery.data ?? null,
    isLoading: activeOrderQuery.isLoading,
    error: activeOrderQuery.error ?? advanceMutation.error ?? releaseMutation.error,
    advanceStatus: (targetOrderId: string) =>
      advanceMutation.mutateAsync(targetOrderId),
    /** True when an advance failed because the order changed concurrently. */
    advanceFailedWith: (r: AdvanceOrderResult, code: string) =>
      !r.success && r.error === code,
    isAdvancing: advanceMutation.isPending,
    releaseOrder: (orderId: string, reason: string) =>
      releaseMutation.mutateAsync({ orderId, reason }),
    isReleasing: releaseMutation.isPending,
  };
}

export type { Order };

