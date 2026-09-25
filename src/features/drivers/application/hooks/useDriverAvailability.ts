import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { DriverFulfillmentRepository } from '../../domain/repositories/DriverFulfillmentRepository';
import { SupabaseDriverFulfillmentRepository } from '../../infrastructure/SupabaseDriverFulfillmentRepository';
import { useNetworkStatus } from './useNetworkStatus';
import { maybePromptAndRegister } from '@/features/notifications/application/hooks/useNotificationPermission';

const driverFulfillmentRepository: DriverFulfillmentRepository =
  new SupabaseDriverFulfillmentRepository();

export const OFFLINE_ABORT_MESSAGE = 'No connection — please retry';

/**
 * Driver availability state backed by driver_profiles.is_available via the
 * toggle_driver_availability RPC. Server state lives entirely in TanStack
 * Query (Principle IV); mutations abort while offline (FR-016).
 */
export function useDriverAvailability() {
  const queryClient = useQueryClient();
  const { isConnected } = useNetworkStatus();
  const { user } = useAuth();

  const availabilityQuery = useQuery({
    queryKey: ['driver', 'availability'],
    queryFn: () => driverFulfillmentRepository.getAvailability(),
  });

  const toggleMutation = useMutation({
    mutationFn: async (next: boolean) => {
      if (!isConnected) {
        throw new Error(OFFLINE_ABORT_MESSAGE);
      }
      return driverFulfillmentRepository.toggleAvailability(next);
    },
    onSuccess: (_data, next) => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'availability'] });
      // Going online/offline changes the pool the server returns.
      queryClient.invalidateQueries({ queryKey: ['driver', 'availableOrders'] });
      // Contextual permission prompt (FR-013): first toggle to Available only.
      if (next && user) {
        maybePromptAndRegister(user.id).catch(() => undefined);
      }
    },
  });

  return {
    isAvailable: availabilityQuery.data ?? false,
    isLoading: availabilityQuery.isLoading,
    error: availabilityQuery.error ?? toggleMutation.error,
    toggle: (next: boolean) => toggleMutation.mutate(next),
    isToggling: toggleMutation.isPending,
  };
}
