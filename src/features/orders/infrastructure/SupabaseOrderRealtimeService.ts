import { supabase } from '@/shared/lib/supabase';
import { queryClient } from '@/shared/lib/queryClient';
import { Order } from '../domain/entities/Order';
import { OrderStatus } from '../domain/entities/OrderStatus';
import { OrderRealtimeService } from '../domain/services/OrderRealtimeService';
import { Unsubscribe } from '@/shared/types/common';

/**
 * Supabase Realtime-backed order event subscriptions. Transport details stay
 * in Infrastructure; updates write directly into the TanStack Query cache
 * (setQueryData) so server state remains single-sourced (Principles IV, VIII).
 */
export class SupabaseOrderRealtimeService implements OrderRealtimeService {
  subscribeToOrderStatus(
    orderId: string,
    callback: (status: OrderStatus) => void,
  ): Unsubscribe {
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status?: OrderStatus }).status;
          if (!newStatus) return;
          callback(newStatus);

          // Keep the cached order query in sync without a refetch round-trip.
          queryClient.setQueryData<Order>(['order', orderId], (current) =>
            current ? { ...current, status: newStatus } : current,
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeToAvailableOrders(callback: (orders: Order[]) => void): Unsubscribe {
    const channel = supabase
      .channel('available-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'status=eq.pending',
        },
        async () => {
          // Refetch the pool through the cache so drivers see new orders.
          await queryClient.invalidateQueries({ queryKey: ['availableOrders'] });
          const cached = queryClient.getQueryData<Order[]>(['availableOrders']);
          if (cached) callback(cached);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
