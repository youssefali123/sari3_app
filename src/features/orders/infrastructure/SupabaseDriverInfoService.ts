import { supabase } from '@/shared/lib/supabase';
import { OrderDriverInfo } from '../domain/entities/OrderDriverInfo';
import { DriverInfoService } from '../domain/services/DriverInfoService';

interface RawDriverInfo {
  order_id: string;
  driver_name: string;
  driver_photo_url: string | null;
  driver_phone: string | null;
}

/**
 * Invokes the get_order_driver_info RPC, which enforces ownership + active
 * status + driver assignment server-side and returns NULL otherwise.
 */
export class SupabaseDriverInfoService implements DriverInfoService {
  async getOrderDriverInfo(orderId: string): Promise<OrderDriverInfo | null> {
    const { data, error } = await supabase.rpc('get_order_driver_info', {
      p_order_id: orderId,
    });
    if (error) throw new Error(error.message);
    if (!data) return null;

    const raw = data as RawDriverInfo;
    return {
      orderId: raw.order_id,
      driverName: raw.driver_name,
      driverPhotoUrl: raw.driver_photo_url,
      driverPhone: raw.driver_phone,
    };
  }
}
