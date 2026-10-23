import { supabase } from '@/shared/lib/supabase';
import { AvailableOrderPreview } from '../domain/entities/AvailableOrderPreview';
import { DeliveryHistoryEntry } from '../domain/entities/DeliveryHistoryEntry';
import {
  AddOnSnapshot,
  Order,
  OrderItemSnapshot,
  PaymentMethod,
} from '../../orders/domain/entities/Order';
import { OrderStatus } from '../../orders/domain/entities/OrderStatus';
import {
  AdvanceOrderResult,
  ClaimOrderResult,
  DriverFulfillmentRepository,
} from '../domain/repositories/DriverFulfillmentRepository';
import { classifyDriverError } from './driverErrorClassifier';

const ACTIVE_STATUSES = ['accepted', 'preparing', 'out_for_delivery'] as const;

interface AddOnSnapshotRow {
  addon_id?: string;
  addonId?: string;
  name: string;
  price: number | string;
}

function mapAddOnSnapshots(raw: unknown): AddOnSnapshot[] {
  if (!Array.isArray(raw)) return [];
  return (raw as AddOnSnapshotRow[]).map((a) => ({
    addonId: (a.addon_id ?? a.addonId) as string,
    name: a.name,
    price: Number(a.price),
  }));
}

interface OrderItemRow {
  id: string;
  order_id: string | null;
  product_id: string;
  product_name: string;
  unit_price: number | string;
  quantity: number | string;
  subtotal: number | string | null;
  addon_snapshots: unknown;
  variant_name: string | null;
}

function mapOrderItem(row: OrderItemRow): OrderItemSnapshot {
  return {
    id: row.id,
    orderId: row.order_id ?? '',
    productId: row.product_id,
    productName: row.product_name,
    variantName: row.variant_name,
    unitPrice: Number(row.unit_price),
    quantity: Number(row.quantity),
    subtotal: Number(row.subtotal ?? 0),
    addonSnapshots: mapAddOnSnapshots(row.addon_snapshots),
  };
}

interface OrderRow {
  id: string;
  customer_id: string;
  driver_id: string | null;
  restaurant_id: string;
  restaurant_name: string;
  status: OrderStatus;
  delivery_address: string;
  delivery_address_label: string | null;
  payment_method: PaymentMethod;
  coupon_code: string | null;
  discount_amount: number | string;
  subtotal_amount: number | string;
  delivery_fee: number | string;
  total_amount: number | string;
  created_at: string | null;
  accepted_at: string | null;
  delivered_at: string | null;
  updated_at: string | null;
  idempotency_key?: string | null;
  customer_hidden_at?: string | null;
}

function mapOrder(row: OrderRow, items: OrderItemSnapshot[]): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    driverId: row.driver_id,
    storeId: row.restaurant_id,
    storeName: row.restaurant_name,
    status: row.status,
    deliveryAddressSnapshot: row.delivery_address,
    deliveryAddressLabel: row.delivery_address_label,
    paymentMethod: row.payment_method,
    couponCode: row.coupon_code,
    discountAmount: Number(row.discount_amount),
    subtotalAmount: Number(row.subtotal_amount),
    deliveryFee: Number(row.delivery_fee),
    totalAmount: Number(row.total_amount),
    items,
    idempotencyKey: row.idempotency_key ?? null,
    createdAt: row.created_at ?? '',
    acceptedAt: row.accepted_at,
    deliveredAt: row.delivered_at,
    updatedAt: row.updated_at ?? '',
    customerHiddenAt: row.customer_hidden_at ?? null,
  };
}

async function fetchOrderWithItems(orderId: string): Promise<Order | null> {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  if (orderError) throw classifyDriverError(orderError);
  if (!orderData) return null;

  const { data: itemsData, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  if (itemsError) throw classifyDriverError(itemsError);

  return mapOrder(
    orderData as OrderRow,
    (itemsData ?? []).map(mapOrderItem),
  );
}

export class SupabaseDriverFulfillmentRepository
  implements DriverFulfillmentRepository
{
  async toggleAvailability(isAvailable: boolean): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('toggle_driver_availability', {
        p_is_available: isAvailable,
      });
      if (error) throw classifyDriverError(error);
      return Boolean((data as { is_available?: boolean })?.is_available);
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  async getAvailability(): Promise<boolean> {
    try {
      const user = await this.requireUser();
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('is_available')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw classifyDriverError(error);
      return Boolean(data?.is_available);
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  async getAvailableOrders(): Promise<AvailableOrderPreview[]> {
    try {
      const { data, error } = await supabase.rpc('get_available_orders');
      if (error) throw classifyDriverError(error);

      const rows = (Array.isArray(data) ? data : []) as {
        id: string;
        storeName: string;
        storeNeighbourhood: string | null;
        itemCount: number | string;
        createdAt: string;
      }[];

      return rows.map((row) => ({
        id: row.id,
        storeName: row.storeName,
        storeNeighbourhood: row.storeNeighbourhood ?? '',
        itemCount: Number(row.itemCount),
        createdAt: row.createdAt,
      }));
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  async claimOrder(orderId: string): Promise<ClaimOrderResult> {
    try {
      const user = await this.requireUser();
      const { data, error } = await supabase.rpc('claim_order', {
        p_order_id: orderId,
        p_driver_id: user.id,
      });
      if (error) throw classifyDriverError(error);

      const payload = data as { claimed: boolean; order: OrderRow | null };
      if (!payload.claimed || !payload.order) {
        return { claimed: false, order: null };
      }

      // claim_order returns the bare orders row; the full Order (with item
      // snapshots) is read through the normal RLS-visible path.
      const order = await fetchOrderWithItems(payload.order.id);
      if (!order) {
        throw classifyDriverError(new Error('Claimed order could not be read back'));
      }
      return { claimed: true, order };
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  async declineOrder(orderId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('decline_order', {
        p_order_id: orderId,
      });
      if (error) throw classifyDriverError(error);
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  async advanceOrderStatus(orderId: string): Promise<AdvanceOrderResult> {
    try {
      const { data, error } = await supabase.rpc('advance_order_status', {
        p_order_id: orderId,
      });
      if (error) throw classifyDriverError(error);
      const payload = data as {
        success?: boolean;
        new_status?: string;
        error?: string;
        message?: string;
      };
      return {
        success: Boolean(payload?.success),
        newStatus: payload?.new_status,
        error: payload?.error,
        message: payload?.message,
      };
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  async releaseOrder(orderId: string, reason: string): Promise<void> {
    if (reason.trim() === '') {
      throw classifyDriverError(new Error('RELEASE_REASON_REQUIRED'));
    }
    try {
      const { error } = await supabase.rpc('release_order', {
        p_order_id: orderId,
        p_reason: reason.trim(),
      });
      if (error) throw classifyDriverError(error);
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  async getActiveOrder(): Promise<Order | null> {
    try {
      const user = await this.requireUser();
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .eq('driver_id', user.id)
        .in('status', [...ACTIVE_STATUSES])
        .maybeSingle();
      if (error) throw classifyDriverError(error);
      if (!data) return null;
      return fetchOrderWithItems(data.id);
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  async getDeliveryHistory(): Promise<DeliveryHistoryEntry[]> {
    try {
      const { data, error } = await supabase.rpc('get_driver_history');
      if (error) throw classifyDriverError(error);

      const rows = (Array.isArray(data) ? data : []) as {
        id: string;
        order_id: string;
        store_name: string;
        order_date: string;
        final_status: DeliveryHistoryEntry['finalStatus'];
        release_reason: string | null;
      }[];

      return rows.map((row) => ({
        id: row.id,
        orderId: row.order_id,
        storeName: row.store_name,
        orderDate: row.order_date,
        finalStatus: row.final_status,
        releaseReason: row.release_reason,
      }));
    } catch (err) {
      throw classifyDriverError(err);
    }
  }

  private async requireUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw classifyDriverError(new Error('NOT_AUTHENTICATED'));
    return user;
  }
}
