import {
  CouponValidationContext,
  CouponValidationResult,
} from '../entities/Coupon';

/**
 * Abstraction for authoritative coupon validation via the database RPC.
 */
export interface CouponRepository {
  /**
   * Authoritatively validate a coupon code against current checkout context
   * via database RPC. Does not redeem or write to the database.
   */
  validateCoupon(context: CouponValidationContext): Promise<CouponValidationResult>;
}
