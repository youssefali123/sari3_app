import { supabase } from '@/shared/lib/supabase';
import { Unsubscribe } from '@/shared/types/common';
import { DriverRealtimeService } from '../domain/services/DriverRealtimeService';

// supabase-js dedupes channels by name: channel(name) returns the existing,
// already-subscribed channel, and calling .on() on it throws. Multiple hook
// instances (pool screen + detail screen, or two tabs) subscribe to the same
// streams, so every subscription must get its own uniquely named channel.
let channelSeq = 0;

/**
 * Supabase Realtime transport for driver fulfillment. Callbacks only signal
 * "something changed" — the TanStack Query cache is invalidated by the
 * subscribing hooks, so all server state still flows through the repository
 * (Principles IV, V, VIII).
 */
export class SupabaseDriverRealtimeService implements DriverRealtimeService {
  subscribeToAvailableOrders(onOrdersChanged: () => void): Unsubscribe {
    // Subscribes to the PII-free driver_pool_signals table, not orders:
    // Realtime enforces RLS, and drivers cannot SELECT pending order rows
    // (driver_id IS NULL) — a drivers-visible orders policy would leak the
    // customer's delivery address (FR-004). The signal carries only the
    // order_id; the hook refetches the pool via get_available_orders().
    const channel = supabase
      .channel(`driver-available-orders-${++channelSeq}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'driver_pool_signals',
        },
        () => onOrdersChanged(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeToActiveOrder(
    orderId: string,
    onStatusChange: (status: string) => void,
  ): Unsubscribe {
    const channel = supabase
      .channel(`driver-active-order-${orderId}-${++channelSeq}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: string }).status;
          if (!newStatus) return;
          onStatusChange(newStatus);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
