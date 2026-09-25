import { useQuery } from '@tanstack/react-query';
import { DriverFulfillmentRepository } from '../../domain/repositories/DriverFulfillmentRepository';
import { SupabaseDriverFulfillmentRepository } from '../../infrastructure/SupabaseDriverFulfillmentRepository';

const driverFulfillmentRepository: DriverFulfillmentRepository =
  new SupabaseDriverFulfillmentRepository();

export const DRIVER_HISTORY_QUERY_KEY = ['driver', 'history'] as const;

/**
 * Delivery history (completed, declined, released, cancelled) newest-first.
 * Reads through the get_driver_history SECURITY DEFINER RPC because released
 * orders carry driver_id = NULL and standard orders RLS would hide them.
 */
export function useDriverHistory() {
  return useQuery({
    queryKey: DRIVER_HISTORY_QUERY_KEY,
    queryFn: () => driverFulfillmentRepository.getDeliveryHistory(),
  });
}
