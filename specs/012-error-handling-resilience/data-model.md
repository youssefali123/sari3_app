# Data Model: Error Handling & Resilience

**Feature Branch**: `012-error-handling-resilience`  
**Date**: 2026-10-22  
**Spec**: [specs/012-error-handling-resilience/spec.md](spec.md)

---

## 1. Domain Error Taxonomy

### 1.1 Base Error Abstraction (`src/shared/types/errors.ts`)

```typescript
/**
 * Standard typed application error.
 * Free of UI or transport frameworks (Constitution Principle II).
 */
export interface AppError<TKind extends string = string> {
  readonly kind: TKind;
  readonly message?: string; // Optional English developer/debug message, never displayed in UI
  readonly originalError?: unknown; // Preserved for console logging in __DEV__
}

/** Generic error kinds shared across all domains */
export type SharedErrorKind =
  | 'network_error'
  | 'session_expired'
  | 'permission_denied'
  | 'not_found'
  | 'unexpected';
```

---

### 1.2 Orders Domain Error Kinds (`src/features/orders/domain/entities/OrderError.ts`)

```typescript
import { AppError } from '@/shared/types/errors';

export type OrderErrorKind =
  // Pre-condition / Place order errors
  | 'auth_required'
  | 'only_customers_can_place_orders'
  | 'missing_idempotency_key'
  | 'store_not_found'
  | 'store_closed'
  | 'address_not_found'
  | 'product_unavailable'
  | 'product_variant_required'
  | 'addon_unavailable'
  | 'coupon_invalid'
  | 'coupon_expired'
  | 'coupon_store_restricted'
  | 'coupon_min_order_not_met'
  | 'coupon_usage_limit_reached'
  // Cancellation / Transition errors
  | 'order_not_found'
  | 'order_cannot_be_cancelled'
  | 'order_state_changed'
  | 'unauthorized'
  // Network / Shared
  | 'network_error'
  | 'unexpected';

export type OrderError = AppError<OrderErrorKind>;
```

---

### 1.3 Drivers Domain Error Kinds (`src/features/drivers/domain/entities/DriverError.ts`)

```typescript
import { AppError } from '@/shared/types/errors';

export type DriverErrorKind =
  | 'driver_already_has_active_order'
  | 'user_not_a_driver'
  | 'driver_id_mismatch'
  | 'order_not_found_or_not_assigned'
  | 'invalid_status_transition'
  | 'pool_unauthorized'
  | 'history_unauthorized'
  | 'claim_conflict' // another driver claimed it
  | 'network_error'
  | 'unexpected';

export type DriverError = AppError<DriverErrorKind>;
```

---

### 1.4 Address Domain Error Kinds (`src/features/addresses/domain/entities/AddressError.ts`)

```typescript
import { AppError } from '@/shared/types/errors';

export type AddressErrorKind =
  | 'address_not_found'
  | 'validation_failed'
  | 'unauthorized'
  | 'network_error'
  | 'unexpected';

export type AddressError = AppError<AddressErrorKind>;
```

---

## 2. Arabic Message Dictionaries

Each feature maintains a strictly-typed Arabic dictionary keyed by domain error kinds.

```typescript
export type ErrorMessageDictionary<TKind extends string> = Record<TKind, string>;

// Example: orders messages
export const ordersArabicErrorMessages: ErrorMessageDictionary<OrderErrorKind> = {
  auth_required: 'يرجى تسجيل الدخول لمتابعة الطلب.',
  only_customers_can_place_orders: 'حسابات السائقين لا يمكنها تقديم طلبات طعام.',
  missing_idempotency_key: 'تعذر التحقق من صحة الطلب، حاول مرة أخرى.',
  store_not_found: 'المتجر المطلوب غير موجود.',
  store_closed: 'المتجر مغلق حالياً ولا يستقبل طلبات جديدة.',
  address_not_found: 'عنوان التوصيل المحدد غير صالح أو تم حذفه.',
  product_unavailable: 'أحد المنتجات في سلتك لم يعد متوفراً حالياً.',
  product_variant_required: 'يرجى تحديد تفاصيل وحجم المنتج.',
  addon_unavailable: 'أحد الإضافات المحددة لم تعد متوفرة.',
  coupon_invalid: 'رمز الكوبون غير صحيح.',
  coupon_expired: 'انتهت صلاحية هذا الكوبون.',
  coupon_store_restricted: 'هذا الكوبون غير صالح لهذا المتجر.',
  coupon_min_order_not_met: 'قيمة الطلب أقل من الحد الأدنى لتفعيل الكوبون.',
  coupon_usage_limit_reached: 'تم استنفاد الحد الأقصى لاستخدام هذا الكوبون.',
  order_not_found: 'الطلب غير موجود.',
  order_cannot_be_cancelled: 'لا يمكن إلغاء الطلب في مرحلته الحالية.',
  order_state_changed: 'تغيرت حالة الطلب، يرجى تحديث الصفحة.',
  unauthorized: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  network_error: 'تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت.',
  unexpected: 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.',
};
```

---

## 3. Cart Revalidation Models (`src/features/cart/domain/entities/CartRevalidation.ts`)

### 3.1 Price Difference Entity
```typescript
export interface AddOnPriceDifference {
  readonly addonId: string;
  readonly name: string;
  readonly oldPrice: number;
  readonly newPrice: number;
  readonly difference: number;
}

export interface CartPriceDifference {
  readonly cartItemId: string;
  readonly productId: string;
  readonly productName: string;
  readonly oldBasePrice: number;
  readonly newBasePrice: number;
  readonly oldItemTotal: number;
  readonly newItemTotal: number;
  readonly difference: number;
  readonly addonDifferences: readonly AddOnPriceDifference[];
}
```

### 3.2 Unavailable Item Entity
```typescript
export type UnavailableReason =
  | 'product_unavailable'
  | 'variant_unavailable'
  | 'addon_unavailable';

export interface CartUnavailableItem {
  readonly cartItemId: string;
  readonly productId: string;
  readonly productName: string;
  readonly reason: UnavailableReason;
  readonly description: string;
}
```

### 3.3 Revalidation Result
```typescript
export interface CartRevalidationResult {
  readonly isStoreOpen: boolean;
  readonly storeName: string;
  readonly priceDifferences: readonly CartPriceDifference[];
  readonly unavailableItems: readonly CartUnavailableItem[];
  readonly hasPriceChanges: boolean;
  readonly hasUnavailableItems: boolean;
  readonly oldSubtotal: number;
  readonly newSubtotal: number;
  readonly subtotalDifference: number;
  readonly updatedItems: readonly CartItem[]; // Cart items updated to live prices
}
```

---

## 4. Root Error Boundary Contract Types

```typescript
export interface RootErrorBoundaryProps {
  readonly error: Error;
  readonly retry: () => Promise<void> | void;
}

export interface RootErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}
```

---

## 5. Write Unknown Outcome State Model

```text
[ Mutation Triggered ]
       │
       ▼
[ HTTP / RPC in flight ]
       │
   (Network Drops / Timeout)
       │
       ▼
[ Unknown Outcome Dialog ]
  ├── Stays on screen
  ├── Retains form data & active idempotencyKey
  ├── Invalidates related server queries
  │
  ├── Action 1: "إعادة المحاولة" (Retry Idempotently)
  │      └── Calls mutation with SAME idempotencyKey
  │             ├── Backend returns existing record (Success)
  │             └── OR creates record if missing (Success)
  │
  └── Action 2: "عرض طلباتي" / "عرض الطلب النشط" (Navigate to View)
         └── Navigates to query view to observe authoritative state
```

---

## 6. Entity Validation Rules

| Entity | Field | Rule | Violation Handling |
|---|---|---|---|
| `AppError` | `kind` | Must be a recognized domain error kind | Falls back to `'unexpected'` |
| `CartPriceDifference` | `difference` | `newItemTotal - oldItemTotal` | Evaluated server-side & re-checked on client |
| `CartUnavailableItem` | `cartItemId` | Must correspond to an existing item in Redux cart | Ignored if item was removed |
| `CartRevalidationResult` | `isStoreOpen` | If false, checkout is blocked entirely | Blocks confirmation; displays store-closed notice |
| `CheckoutIntent` | `idempotencyKey` | UUID v4, preserved across retries until server confirmation | Kept in Redux; rotated only if cart items change |
