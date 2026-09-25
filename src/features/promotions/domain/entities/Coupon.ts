import { MoneyAmount } from '@/shared/types/common';

/**
 * Coupon rules and server-validated discount calculation (BR-004, FR-013,
 * FR-014). The server is the final authority on any discount.
 */
export type CouponDiscountType = 'percentage' | 'fixed_amount';

export interface Coupon {
  id: string;
  code: string; // Uppercase, unique
  discountType: CouponDiscountType;
  discountValue: number; // e.g. 10 for 10%, or 500 piasters
  minOrderAmount: MoneyAmount | null;
  maxDiscountAmount: MoneyAmount | null;
  storeId: string | null; // null = any store
  maxRedemptions: number | null;
  currentRedemptions: number;
  isActive: boolean;
  startsAt: string;
  expiresAt: string | null;
}

export interface CouponValidationContext {
  code: string;
  storeId: string;
  items: {
    productId: string;
    quantity: number;
    addonIds: string[];
  }[];
  customerId: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  /** In piasters; 0 when invalid. */
  discountAmount: MoneyAmount;
  discountType: CouponDiscountType | null;
  rejectionReason: string | null;
}
