# Domain Repositories & Service Contracts: Catalog and Checkout Foundation

**Feature**: Catalog and Checkout Foundation  
**Branch**: `001-catalog-checkout-foundation`  
**Date**: 2026-09-16  
**Status**: Completed

In accordance with Constitution Principle II (Lightweight Clean Architecture per Feature) and Principle III (Fixed Dependency Direction), these interfaces reside purely in the **Domain** layer. They contain only TypeScript types and primitives — no imports from React Native, Expo, Supabase, TanStack Query, or Redux.

---

## 1. Store Repository (`StoreRepository.ts`)

```typescript
import { Store, StoreType } from '../entities/Store';
import { StoreCategory } from '../entities/StoreCategory';

export interface StoreRepository {
  /**
   * List all active stores, optionally filtered by type (restaurant or market).
   */
  getStores(type?: StoreType): Promise<Store[]>;

  /**
   * Retrieve a single store by its unique ID.
   */
  getStoreById(id: string): Promise<Store>;

  /**
   * Retrieve all product categories for a specific store, ordered by displayOrder.
   */
  getCategoriesByStoreId(storeId: string): Promise<StoreCategory[]>;
}
```

---

## 2. Product Repository (`ProductRepository.ts`)

```typescript
import { Product } from '../entities/Product';
import { ProductAddOn } from '../entities/ProductAddOn';

export interface ProductRepository {
  /**
   * Retrieve all products for a store, optionally filtered by category.
   */
  getProductsByStore(storeId: string, categoryId?: string): Promise<Product[]>;

  /**
   * Retrieve a single product by its unique ID.
   */
  getProductById(id: string): Promise<Product>;

  /**
   * Retrieve all available add-ons for a specific product.
   */
  getAddOnsByProductId(productId: string): Promise<ProductAddOn[]>;
}
```

---

## 3. Favorites Repository (`FavoritesRepository.ts`)

```typescript
import { Store } from '../../restaurants/domain/entities/Store';
import { Product } from '../../products/domain/entities/Product';

export interface FavoritesRepository {
  /**
   * Retrieve all stores favorited by the current customer.
   */
  getFavoriteStores(customerId: string): Promise<Store[]>;

  /**
   * Retrieve all products favorited by the current customer.
   */
  getFavoriteProducts(customerId: string): Promise<Product[]>;

  /**
   * Add a store to the customer's favorites.
   */
  addFavoriteStore(customerId: string, storeId: string): Promise<void>;

  /**
   * Remove a store from the customer's favorites.
   */
  removeFavoriteStore(customerId: string, storeId: string): Promise<void>;

  /**
   * Add a product to the customer's favorites.
   */
  addFavoriteProduct(customerId: string, productId: string): Promise<void>;

  /**
   * Remove a product from the customer's favorites.
   */
  removeFavoriteProduct(customerId: string, productId: string): Promise<void>;
}
```

---

## 4. Promotion Repository (`PromotionRepository.ts`)

```typescript
import { Promotion } from '../entities/Promotion';
import { Store } from '../../restaurants/domain/entities/Store';
import { Product } from '../../products/domain/entities/Product';

export interface PromotionRepository {
  /**
   * Retrieve all currently active promotional offers for the home screen.
   */
  getActivePromotions(): Promise<Promotion[]>;

  /**
   * Retrieve the promoted stores or products associated with a promotion.
   */
  getPromotionTargetItems(promotionId: string): Promise<{
    stores?: Store[];
    products?: Product[];
  }>;
}
```

---

## 5. Coupon Repository (`CouponRepository.ts`)

```typescript
import {
  CouponValidationContext,
  CouponValidationResult,
} from '../entities/Coupon';

export interface CouponRepository {
  /**
   * Authoritatively validate a coupon code against current checkout context
   * via database RPC. Does not redeem or write to the database.
   */
  validateCoupon(context: CouponValidationContext): Promise<CouponValidationResult>;
}
```

---

## 6. Saved Address Repository (`AddressRepository.ts`)

```typescript
import { SavedDeliveryAddress } from '../entities/SavedDeliveryAddress';

export interface CreateAddressInput {
  label: string;
  addressText: string;
  isDefault?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  addressText?: string;
  isDefault?: boolean;
}

export interface AddressRepository {
  /**
   * Retrieve all saved addresses for a customer.
   */
  getAddresses(customerId: string): Promise<SavedDeliveryAddress[]>;

  /**
   * Create a new saved delivery address.
   */
  createAddress(customerId: string, input: CreateAddressInput): Promise<SavedDeliveryAddress>;

  /**
   * Update an existing delivery address.
   */
  updateAddress(id: string, input: UpdateAddressInput): Promise<SavedDeliveryAddress>;

  /**
   * Delete a saved delivery address.
   */
  deleteAddress(id: string): Promise<void>;
}
```

---

## 7. Order Repository (`OrderRepository.ts`)

```typescript
import { Order } from '../entities/Order';

export interface PlaceOrderInput {
  storeId: string;
  deliveryAddressId: string;
  paymentMethod: 'cash_on_delivery';
  couponCode?: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    addonIds: string[];
  }>;
}

export interface OrderRepository {
  /**
   * Submit an order request for atomic server validation and creation.
   */
  placeOrder(input: PlaceOrderInput): Promise<Order>;

  /**
   * Retrieve an order by its unique ID.
   */
  getOrderById(id: string): Promise<Order>;

  /**
   * Retrieve order history for the authenticated customer.
   */
  getCustomerOrders(customerId: string): Promise<Order[]>;
}
```

---

## 8. Driver Info Service (`DriverInfoService.ts`)

```typescript
import { OrderDriverInfo } from '../entities/OrderDriverInfo';

export interface DriverInfoService {
  /**
   * Retrieve the scoped driver contact details for an active order.
   * Returns null if order is not in active fulfillment (accepted, preparing, out_for_delivery) or driver is not assigned.
   */
  getOrderDriverInfo(orderId: string): Promise<OrderDriverInfo | null>;
}
```
