# Data Model: Catalog and Checkout Foundation

**Feature**: Catalog and Checkout Foundation  
**Branch**: `001-catalog-checkout-foundation`  
**Date**: 2026-09-16  
**Status**: Completed

---

## 1. Entity Overview & Domain Model

In accordance with Clean Architecture (Principle II) and Screaming Architecture (Principle I), domain entities are expressed as pure TypeScript interfaces with no infrastructure dependencies. Currency values are integers in the smallest currency unit (piasters), represented by `MoneyAmount = number`.

### 1.1 Store Entity
Represents both Restaurants and Markets under a unified model (BR-001, CAP-001).

```typescript
export type StoreType = 'restaurant' | 'market';

export interface Store {
  id: string;
  name: string;
  type: StoreType;
  description: string | null;
  imageUrl: string | null;
  address: string;
  rating: number | null; // 0.0 - 5.0
  isOpen: boolean;
  createdAt: string;
}
```

### 1.2 Store Category Entity
Organizes products within a store (CAP-002, FR-003).

```typescript
export interface StoreCategory {
  id: string;
  storeId: string;
  name: string;
  displayOrder: number;
  createdAt: string;
}
```

### 1.3 Product Entity
Menu/catalog item belonging to a store and category (CAP-002, FR-003, FR-004).

```typescript
export interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: MoneyAmount; // in piasters, non-negative
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
}
```

### 1.4 Product Add-On Entity
Optional binary modifier for a product (CAP-003, BR-003, FR-004, FR-005).

```typescript
export interface ProductAddOn {
  id: string;
  productId: string;
  name: string;
  price: MoneyAmount; // in piasters, non-negative
  isAvailable: boolean;
  createdAt: string;
}
```

### 1.5 Cart Item (Client-Local State)
Client-side representation of an item intended for purchase (BR-002, BR-003, Principle IV).
Identity is composite: `generateCartItemId(productId, addonIds)`.

```typescript
export interface CartAddOnSelection {
  addonId: string;
  name: string;
  unitPrice: MoneyAmount;
}

export interface CartItem {
  id: string; // Composite key: `${productId}::${sortedAddonIds.join(',')}`
  productId: string;
  productName: string;
  productImageUrl: string | null;
  baseUnitPrice: MoneyAmount;
  selectedAddOns: CartAddOnSelection[];
  quantity: number; // >= 1
}

export interface CartState {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
}
```

### 1.6 Saved Delivery Address Entity
Customer profile address for selection at checkout (CAP-009, FR-015, FR-016).

```typescript
export interface SavedDeliveryAddress {
  id: string;
  customerId: string;
  label: string; // e.g., "Home", "Work"
  addressText: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 1.7 Favorites Entities
Customer favorites for stores and products (CAP-005, CAP-006, FR-008, FR-009, FR-010).

```typescript
export interface FavoriteStore {
  customerId: string;
  storeId: string;
  createdAt: string;
}

export interface FavoriteProduct {
  customerId: string;
  productId: string;
  createdAt: string;
}
```

### 1.8 Promotion & Promotion Items
Active marketing banners on the home screen (CAP-007, FR-011, FR-012).

```typescript
export type PromotionTargetType = 'store' | 'product';

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  targetType: PromotionTargetType;
  isActive: boolean;
  displayOrder: number;
  startsAt: string;
  expiresAt: string | null;
  targetIds: string[]; // List of store IDs or product IDs promoted
}
```

### 1.9 Coupon & Coupon Validation Result
Coupon rules and server-validated discount calculation (CAP-008, BR-004, FR-013, FR-014).

```typescript
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
  items: Array<{
    productId: string;
    quantity: number;
    addonIds: string[];
  }>;
  customerId: string;
}

export interface CouponValidationResult {
  isValid: boolean;
  discountAmount: MoneyAmount; // In piasters, 0 if invalid
  discountType: CouponDiscountType | null;
  rejectionReason: string | null;
}
```

### 1.10 Order & Immutable Historical Snapshots
Server-authoritative persisted order with point-in-time snapshots (BR-005, BR-006, BR-007, FR-017, FR-018, FR-019, FR-020, Principle VII).

```typescript
export type PaymentMethod = 'cash_on_delivery';

export enum OrderStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Preparing = 'preparing',
  OutForDelivery = 'out_for_delivery',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  Rejected = 'rejected',
}

export interface AddOnSnapshot {
  addonId: string;
  name: string;
  price: MoneyAmount;
}

export interface OrderItemSnapshot {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  unitPrice: MoneyAmount;
  quantity: number;
  subtotal: MoneyAmount;
  addonSnapshots: AddOnSnapshot[];
}

export interface Order {
  id: string;
  customerId: string;
  driverId: string | null;
  storeId: string;
  storeName: string; // Snapshot
  status: OrderStatus;
  deliveryAddressSnapshot: string; // Snapshot text
  deliveryAddressLabel: string | null;
  paymentMethod: PaymentMethod;
  couponCode: string | null;
  discountAmount: MoneyAmount;
  subtotalAmount: MoneyAmount;
  deliveryFee: MoneyAmount; // 0 in foundation phase
  totalAmount: MoneyAmount; // subtotalAmount - discountAmount + deliveryFee
  items: OrderItemSnapshot[];
  createdAt: string;
  acceptedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
}
```

### 1.11 Order-Scoped Driver Info Projection
Secure, read-only driver projection available only during active delivery (BR-008, FR-021, FR-022).

```typescript
export interface OrderDriverInfo {
  orderId: string;
  driverName: string;
  driverPhotoUrl: string | null;
  driverPhone: string | null;
}
```

---

## 2. Relational Database Schema (PostgreSQL / Supabase)

### 2.1 Enum Types
```sql
DO $$ BEGIN
  CREATE TYPE public.store_type AS ENUM ('restaurant', 'market');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_discount_type AS ENUM ('percentage', 'fixed_amount');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash_on_delivery');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

### 2.2 Table: `restaurants` (Stores)
Stores restaurants and markets under a unified table (with backward compatibility).
```sql
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS type public.store_type NOT NULL DEFAULT 'restaurant';

CREATE INDEX IF NOT EXISTS restaurants_type_idx ON public.restaurants(type);
```

### 2.3 Table: `store_categories`
```sql
CREATE TABLE IF NOT EXISTS public.store_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_categories_store_idx ON public.store_categories(store_id, display_order);
```

### 2.4 Table: `products` (Extended)
```sql
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.store_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products(category_id);
```

### 2.5 Table: `product_add_ons`
```sql
CREATE TABLE IF NOT EXISTS public.product_add_ons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL, -- in piasters
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_add_ons_price_nonnegative CHECK (price >= 0)
);

CREATE INDEX IF NOT EXISTS product_add_ons_product_idx ON public.product_add_ons(product_id);
```

### 2.6 Tables: `favorite_stores` and `favorite_products`
```sql
CREATE TABLE IF NOT EXISTS public.favorite_stores (
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, store_id)
);

CREATE TABLE IF NOT EXISTS public.favorite_products (
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS favorite_stores_customer_idx ON public.favorite_stores(customer_id);
CREATE INDEX IF NOT EXISTS favorite_products_customer_idx ON public.favorite_products(customer_id);
```

### 2.7 Tables: `promotions` and `promotion_targets`
```sql
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('store', 'product')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promotion_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT promo_target_has_ref CHECK (store_id IS NOT NULL OR product_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS promotions_active_idx ON public.promotions(is_active, display_order)
  WHERE is_active = true;
```

### 2.8 Tables: `coupons` and `coupon_redemptions`
```sql
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type public.coupon_discount_type NOT NULL,
  discount_value INTEGER NOT NULL, -- percentage or piasters
  min_order_amount INTEGER, -- in piasters
  max_discount_amount INTEGER, -- in piasters (useful for percentage discounts)
  store_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
  max_redemptions INTEGER,
  current_redemptions INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT coupons_discount_positive CHECK (discount_value > 0),
  CONSTRAINT coupons_min_order_nonnegative CHECK (min_order_amount IS NULL OR min_order_amount >= 0)
);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  discount_amount INTEGER NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons(code);
CREATE INDEX IF NOT EXISTS coupon_redemptions_customer_idx ON public.coupon_redemptions(customer_id);
```

### 2.9 Table: `saved_addresses`
```sql
CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address_text TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_addresses_customer_idx ON public.saved_addresses(customer_id);
```

### 2.10 Tables: `orders` and `order_items` (Updated with Snapshots)
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method NOT NULL DEFAULT 'cash_on_delivery',
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_fee INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_address_label TEXT;

-- Drop the legacy uniqueness constraint that prevented ordering same product with different add-ons
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_product_once_per_order;

-- Add add-on snapshots column and subtotal to order_items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS addon_snapshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS subtotal INTEGER NOT NULL DEFAULT 0;
```

---

## 3. Row-Level Security (RLS) Policies

| Table | Operations | Permitted Roles | Condition |
|---|---|---|---|
| `restaurants` | SELECT | `anon`, `authenticated` | `true` (all stores readable) |
| `store_categories` | SELECT | `anon`, `authenticated` | `true` |
| `products` | SELECT | `anon`, `authenticated` | `true` |
| `product_add_ons` | SELECT | `anon`, `authenticated` | `true` |
| `favorite_stores` | SELECT, INSERT, DELETE | `authenticated` | `auth.uid() = customer_id` |
| `favorite_products` | SELECT, INSERT, DELETE | `authenticated` | `auth.uid() = customer_id` |
| `promotions` | SELECT | `anon`, `authenticated` | `is_active = true` |
| `promotion_targets` | SELECT | `anon`, `authenticated` | `true` |
| `coupons` | SELECT | `authenticated` | Only via `SECURITY DEFINER` RPC (direct SELECT restricted) |
| `saved_addresses` | SELECT, INSERT, UPDATE, DELETE | `authenticated` | `auth.uid() = customer_id` |
| `orders` | SELECT | `authenticated` | `auth.uid() = customer_id OR auth.uid() = driver_id` |
| `order_items` | SELECT | `authenticated` | Exists in customer's order or driver's order |

---

## 4. State Transitions

### Order Status Lifecycle
```
[pending] ──(driver accepts)──> [accepted]
                                      │
                               (store prepares)
                                      ▼
                                 [preparing]
                                      │
                                (driver en route)
                                      ▼
                                [out_for_delivery]
                                      │
                                (order completed)
                                      ▼
                                 [delivered] (terminal)
```
- **Driver Info Available**: Strictly while in `accepted`, `preparing`, or `out_for_delivery`.
- **Driver Info Revoked**: Immediately upon reaching `delivered`, `cancelled`, or `rejected`.
