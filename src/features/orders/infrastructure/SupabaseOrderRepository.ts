import { supabase } from '@/shared/lib/supabase';
import {
  AddOnSnapshot,
  Order,
  OrderItemSnapshot,
  PaymentMethod,
} from '../domain/entities/Order';
import { OrderStatus } from '../domain/entities/OrderStatus';
import {
  OrderRepository,
  PlaceOrderInput,
} from '../domain/repositories/OrderRepository';

/**
 * Centralized camelCase → snake_case mapping for add-on id arrays, shared by
 * every payload the client submits to Postgres RPCs.
 */
function toRpcItems(input: PlaceOrderInput['items']) {
  return input.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
    addon_ids: item.addonIds,
  }));
}

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
}

function mapOrderItem(row: OrderItemRow): OrderItemSnapshot {
  return {
    id: row.id,
    orderId: row.order_id ?? '',
    productId: row.product_id,
    productName: row.product_name,
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
    createdAt: row.created_at ?? '',
    acceptedAt: row.accepted_at,
    deliveredAt: row.delivered_at,
    updatedAt: row.updated_at ?? '',
  };
}

export class SupabaseOrderRepository implements OrderRepository {
  async placeOrder(input: PlaceOrderInput): Promise<Order> {
    const p_payload = {
      store_id: input.storeId,
      delivery_address_id: input.deliveryAddressId,
      payment_method: input.paymentMethod,
      coupon_code: input.couponCode ?? null,
      items: toRpcItems(input.items),
    };

    const { data, error } = await supabase.rpc('place_order', { p_payload });
    if (error) throw new Error(error.message);

    const payload = data as {
      id: string;
      customerId: string;
      driverId: string | null;
      storeId: string;
      storeName: string;
      status: OrderStatus;
      deliveryAddressSnapshot: string;
      deliveryAddressLabel: string | null;
      paymentMethod: PaymentMethod;
      couponCode: string | null;
      discountAmount: number | string;
      subtotalAmount: number | string;
      deliveryFee: number | string;
      totalAmount: number | string;
      createdAt: string;
      acceptedAt: string | null;
      deliveredAt: string | null;
      updatedAt: string;
      items: {
        id: string;
        orderId: string;
        productId: string;
        productName: string;
        unitPrice: number | string;
        quantity: number | string;
        subtotal: number | string;
        addonSnapshots: unknown;
      }[];
    };

    return {
      id: payload.id,
      customerId: payload.customerId,
      driverId: payload.driverId,
      storeId: payload.storeId,
      storeName: payload.storeName,
      status: payload.status,
      deliveryAddressSnapshot: payload.deliveryAddressSnapshot,
      deliveryAddressLabel: payload.deliveryAddressLabel,
      paymentMethod: payload.paymentMethod,
      couponCode: payload.couponCode,
      discountAmount: Number(payload.discountAmount),
      subtotalAmount: Number(payload.subtotalAmount),
      deliveryFee: Number(payload.deliveryFee),
      totalAmount: Number(payload.totalAmount),
      items: payload.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        productId: item.productId,
        productName: item.productName,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        subtotal: Number(item.subtotal),
        addonSnapshots: mapAddOnSnapshots(item.addonSnapshots),
      })),
      createdAt: payload.createdAt,
      acceptedAt: payload.acceptedAt,
      deliveredAt: payload.deliveredAt,
      updatedAt: payload.updatedAt,
    };
  }

  async getOrderById(id: string): Promise<Order> {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();
    if (orderError) throw new Error(orderError.message);

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);
    if (itemsError) throw new Error(itemsError.message);

    return mapOrder(
      orderData as OrderRow,
      (itemsData ?? []).map(mapOrderItem),
    );
  }

  async getCustomerOrders(customerId: string): Promise<Order[]> {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    if (ordersError) throw new Error(ordersError.message);

    const rows = (ordersData ?? []) as OrderRow[];
    if (rows.length === 0) return [];

    const { data: itemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in(
        'order_id',
        rows.map((r) => r.id),
      );
    if (itemsError) throw new Error(itemsError.message);

    const itemsByOrder = new Map<string, OrderItemSnapshot[]>();
    for (const item of (itemsData ?? []) as OrderItemRow[]) {
      const key = item.order_id ?? '';
      const list = itemsByOrder.get(key) ?? [];
      list.push(mapOrderItem(item));
      itemsByOrder.set(key, list);
    }

    return rows.map((row) => mapOrder(row, itemsByOrder.get(row.id) ?? []));
  }
}
