import { supabase } from '@/shared/lib/supabase';
import {
  CouponDiscountType,
  CouponValidationContext,
  CouponValidationResult,
} from '../domain/entities/Coupon';
import { CouponRepository } from '../domain/repositories/CouponRepository';

interface RawValidationResult {
  is_valid: boolean;
  discount_amount: number | string;
  discount_type: CouponDiscountType | null;
  rejection_reason: string | null;
}

export class SupabaseCouponRepository implements CouponRepository {
  async validateCoupon(
    context: CouponValidationContext,
  ): Promise<CouponValidationResult> {
    // Centralized camelCase → snake_case mapping for RPC parameters.
    const p_items = context.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      addon_ids: item.addonIds,
    }));

    const { data, error } = await supabase.rpc('validate_coupon', {
      p_code: context.code,
      p_store_id: context.storeId,
      p_items,
      p_customer_id: context.customerId,
    });
    if (error) throw new Error(error.message);

    const raw = data as RawValidationResult;
    return {
      isValid: raw.is_valid,
      discountAmount: Number(raw.discount_amount),
      discountType: raw.discount_type,
      rejectionReason: raw.rejection_reason,
    };
  }
}
