import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Order } from '@/features/orders/domain/entities/Order';
import { DriverFulfillmentRepository } from '../../domain/repositories/DriverFulfillmentRepository';
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
  });

  const orderId = activeOrderQuery.data?.id;

  useEffect(() => {
    if (!orderId) return;
    return driverRealtimeService.subscribeToActiveOrder(orderId, () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_ORDER_QUERY_KEY });
    });
  }, [orderId, queryClient]);

  const advanceMutation = useMutation({
    mutationFn: async (targetOrderId: string): Promise<string> => {
      if (!isConnected) {
        throw new Error(OFFLINE_ABORT_MESSAGE);
      }
      return driverFulfillmentRepository.advanceOrderStatus(targetOrderId);
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_ORDER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['driver', 'availableOrders'] });
      if (newStatus === 'delivered') {
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
    isAdvancing: advanceMutation.isPending,
    releaseOrder: (orderId: string, reason: string) =>
      releaseMutation.mutateAsync({ orderId, reason }),
    isReleasing: releaseMutation.isPending,
  };
}

export type { Order };

