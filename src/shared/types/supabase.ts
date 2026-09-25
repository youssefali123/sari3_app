/**
 * Supabase Database types for the Sari3 schema (public, as of 2026-09-19).
 *
 * Authored from the live schema (project ciznkxtwyrocgiwyapyj) since the
 * Supabase CLI is not available in this environment; keep in sync when
 * running `npx supabase gen types typescript` becomes possible.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'customer' | 'driver' | 'admin';
export type StoreType = 'restaurant' | 'market';
export type CouponDiscountType = 'percentage' | 'fixed_amount';
export type PaymentMethod = 'cash_on_delivery';
export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

export interface ProfilesRow {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface RestaurantsRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string;
  rating: number | null;
  is_open: boolean;
  category: string | null;
  type: StoreType;
  created_at: string;
}

export interface StoreCategoriesRow {
  id: string;
  store_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface ProductsRow {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  category_id: string | null;
  is_available: boolean;
  created_at: string;
}

export interface ProductAddOnsRow {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_available: boolean;
  created_at: string;
}

export interface SavedAddressesRow {
  id: string;
  customer_id: string;
  label: string;
  address_text: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface FavoriteStoresRow {
  customer_id: string;
  store_id: string;
  created_at: string;
}

export interface FavoriteProductsRow {
  customer_id: string;
  product_id: string;
  created_at: string;
}

export interface PromotionsRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  target_type: 'store' | 'product';
  is_active: boolean;
  display_order: number;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface PromotionTargetsRow {
  id: string;
  promotion_id: string;
  store_id: string | null;
  product_id: string | null;
}

export interface CouponsRow {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  store_id: string | null;
  max_redemptions: number | null;
  current_redemptions: number;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface CouponRedemptionsRow {
  id: string;
  coupon_id: string;
  order_id: string;
  customer_id: string;
  discount_amount: number;
  redeemed_at: string;
}

export interface OrdersRow {
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
  discount_amount: number;
  subtotal_amount: number;
  delivery_fee: number;
  total_amount: number;
  created_at: string;
  accepted_at: string | null;
  delivered_at: string | null;
  updated_at: string;
}

export interface OrderItemsRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  addon_snapshots: Json;
  subtotal: number;
}

export interface DriverProfilesRow {
  id: string;
  user_id: string;
  vehicle_type: string | null;
  license_plate: string | null;
  is_available: boolean;
  current_order_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: ProfilesRow };
      restaurants: { Row: RestaurantsRow };
      store_categories: { Row: StoreCategoriesRow };
      products: { Row: ProductsRow };
      product_add_ons: { Row: ProductAddOnsRow };
      saved_addresses: { Row: SavedAddressesRow };
      favorite_stores: { Row: FavoriteStoresRow };
      favorite_products: { Row: FavoriteProductsRow };
      promotions: { Row: PromotionsRow };
      promotion_targets: { Row: PromotionTargetsRow };
      coupons: { Row: CouponsRow };
      coupon_redemptions: { Row: CouponRedemptionsRow };
      orders: { Row: OrdersRow };
      order_items: { Row: OrderItemsRow };
      driver_profiles: { Row: DriverProfilesRow };
    };
    Functions: {
      place_order: { Args: { p_payload: Json }; Returns: Json };
      validate_coupon: {
        Args: {
          p_code: string;
          p_store_id: string;
          p_items: Json;
          p_customer_id?: string | null;
        };
        Returns: Json;
      };
      get_order_driver_info: { Args: { p_order_id: string }; Returns: Json };
      claim_order: { Args: { p_order_id: string; p_driver_id: string }; Returns: Json };
    };
  };
}
