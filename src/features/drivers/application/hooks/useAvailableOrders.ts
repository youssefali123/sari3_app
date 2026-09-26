import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClaimOrderResult, DriverFulfillmentRepository } from '../../domain/repositories/DriverFulfillmentRepository';
import { SupabaseDriverFulfillmentRepository } from '../../infrastructure/SupabaseDriverFulfillmentRepository';
import { SupabaseDriverRealtimeService } from '../../infrastructure/SupabaseDriverRealtimeService';
import { DriverRealtimeService } from '../../domain/services/DriverRealtimeService';
import { AvailableOrderPreview } from '../../domain/entities/AvailableOrderPreview';
import { useNetworkStatus } from './useNetworkStatus';
import { OFFLINE_ABORT_MESSAGE } from './useDriverAvailability';
import {
  ACTIVE_ORDER_QUERY_KEY,
  CANCELLED_NOTICE_QUERY_KEY,
} from './useActiveOrder';

const driverFulfillmentRepository: DriverFulfillmentRepository =
  new SupabaseDriverFulfillmentRepository();

const driverRealtimeService: DriverRealtimeService =
  new SupabaseDriverRealtimeService();

export const AVAILABLE_ORDERS_QUERY_KEY = ['driver', 'availableOrders'] as const;

/**
 * Privacy-safe pool of unclaimed pending orders for an Available driver
 * (via get_available_orders; [] while offline or holding an active order).
 * Realtime pushes invalidate the cache so new/claimed/released orders show
 * within seconds (SC-003).
 */
export function useAvailableOrders() {
  const queryClient = useQueryClient();
  const { isConnected } = useNetworkStatus();

  const poolQuery = useQuery({
    queryKey: AVAILABLE_ORDERS_QUERY_KEY,
    queryFn: () => driverFulfillmentRepository.getAvailableOrders(),
  });

  useEffect(() => {
    return driverRealtimeService.subscribeToAvailableOrders(() => {
      queryClient.invalidateQueries({ queryKey: AVAILABLE_ORDERS_QUERY_KEY });
    });
  }, [queryClient]);

  // Realtime sockets drop while the app is backgrounded and postgres_changes
  // does not replay missed signals. Refetch on foreground — this is what
  // makes a notification tap show the fresh pool — and on every screen focus.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        queryClient.invalidateQueries({ queryKey: AVAILABLE_ORDERS_QUERY_KEY });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: AVAILABLE_ORDERS_QUERY_KEY });
    }, [queryClient]),
  );

  const claimMutation = useMutation({
    mutationFn: async (orderId: string): Promise<ClaimOrderResult> => {
      if (!isConnected) {
        throw new Error(OFFLINE_ABORT_MESSAGE);
      }
      return driverFulfillmentRepository.claimOrder(orderId);
    },
    onSuccess: (result, orderId) => {
      if (result.claimed) {
        queryClient.invalidateQueries({ queryKey: ACTIVE_ORDER_QUERY_KEY });
        queryClient.invalidateQueries({
          queryKey: AVAILABLE_ORDERS_QUERY_KEY,
        });
        // A new claim retires any "customer cancelled" notice.
        queryClient.setQueryData(CANCELLED_NOTICE_QUERY_KEY, null);
      } else {
        // Lost the race: drop the order from the cached pool immediately.
        queryClient.setQueryData<AvailableOrderPreview[]>(
          AVAILABLE_ORDERS_QUERY_KEY,
          (current) =>
            current ? current.filter((o) => o.id !== orderId) : current,
        );
      }
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (orderId: string): Promise<void> => {
      if (!isConnected) {
        throw new Error(OFFLINE_ABORT_MESSAGE);
      }
      return driverFulfillmentRepository.declineOrder(orderId);
    },
    onSuccess: (_, orderId) => {
      // The server pool already excludes declined orders; mirror that
      // locally so the card disappears instantly.
      queryClient.setQueryData<AvailableOrderPreview[]>(
        AVAILABLE_ORDERS_QUERY_KEY,
        (current) =>
          current ? current.filter((o) => o.id !== orderId) : current,
      );
      queryClient.invalidateQueries({ queryKey: ['driver', 'history'] });
    },
  });

  return {
    orders: poolQuery.data ?? [],
    isLoading: poolQuery.isLoading,
    error: poolQuery.error ?? claimMutation.error ?? declineMutation.error,
    claim: (orderId: string) => claimMutation.mutateAsync(orderId),
    isClaiming: claimMutation.isPending,
    decline: (orderId: string) => declineMutation.mutateAsync(orderId),
    decliningOrderId: declineMutation.isPending
      ? declineMutation.variables ?? null
      : null,
  };
}
