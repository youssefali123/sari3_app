# Contract: Infrastructure Error Classification

**Feature Branch**: `012-error-handling-resilience`  
**Date**: 2026-10-22  
**Spec**: [specs/012-error-handling-resilience/spec.md](../spec.md)

---

## 1. Scope & Intent
This contract specifies the interface and behavior for classifying raw backend/network errors into typed domain `AppError<TKind>` objects within each infrastructure repository. Classification occurs exclusively at the infrastructure boundary (FR-001). Presentation components consume typed kinds and Arabic dictionary mappings (FR-002, FR-003).

---

## 2. Classifier Signatures

### 2.1 Shared Base Classifier
```typescript
// src/shared/lib/errorClassifier.ts
export function isNetworkError(error: unknown): boolean;
export function getPostgresErrorCode(error: unknown): string | null;
export function getErrorMessageString(error: unknown): string;
```

### 2.2 Feature Error Classifiers
```typescript
// src/features/orders/infrastructure/orderErrorClassifier.ts
export function classifyOrderError(error: unknown): OrderError;

// src/features/drivers/infrastructure/driverErrorClassifier.ts
export function classifyDriverError(error: unknown): DriverError;

// src/features/addresses/infrastructure/addressErrorClassifier.ts
export function classifyAddressError(error: unknown): AddressError;
```

---

## 3. PostgreSQL Code & Message Classification Map

### 3.1 Orders Domain (`classifyOrderError`)

| Raw Backend Message / Pattern | Postgres Code | Classified `kind` |
|---|---|---|
| `Network request failed`, `Failed to fetch`, `AbortError` | - | `network_error` |
| `AUTH_REQUIRED`, `NOT_AUTHENTICATED` | `42501` | `auth_required` |
| `ONLY_CUSTOMERS_CAN_PLACE_ORDERS` | `42501` | `only_customers_can_place_orders` |
| `MISSING_IDEMPOTENCY_KEY` | - | `missing_idempotency_key` |
| `STORE_NOT_FOUND` | `P0002` | `store_not_found` |
| `STORE_CLOSED` | - | `store_closed` |
| `ADDRESS_NOT_FOUND` | `P0002` | `address_not_found` |
| `PRODUCT_UNAVAILABLE` | - | `product_unavailable` |
| `PRODUCT_VARIANT_REQUIRED` | - | `product_variant_required` |
| `ADDON_UNAVAILABLE` | - | `addon_unavailable` |
| `COUPON_INVALID` | - | `coupon_invalid` |
| `COUPON_EXPIRED` | - | `coupon_expired` |
| `COUPON_STORE_RESTRICTED` | - | `coupon_store_restricted` |
| `COUPON_MIN_ORDER_NOT_MET` | - | `coupon_min_order_not_met` |
| `COUPON_USAGE_LIMIT_REACHED` | - | `coupon_usage_limit_reached` |
| `ORDER_NOT_FOUND` | `P0002` | `order_not_found` |
| `ORDER_CANNOT_BE_CANCELLED` | - | `order_cannot_be_cancelled` |
| `ORDER_STATE_CHANGED` | - | `order_state_changed` |
| `UNAUTHORIZED` | `42501` | `unauthorized` |
| Any unmapped error | - | `unexpected` |

### 3.2 Drivers Domain (`classifyDriverError`)

| Raw Backend Message / Pattern | Postgres Code | Classified `kind` |
|---|---|---|
| `Network request failed`, `Failed to fetch`, `AbortError` | - | `network_error` |
| `Driver already has an active order`, `driver_active_order_unique` | `23505` | `driver_already_has_active_order` |
| `User is not a driver` | - | `user_not_a_driver` |
| `Driver ID mismatch` | - | `driver_id_mismatch` |
| `ORDER_NOT_FOUND_OR_NOT_ASSIGNED` | `P0002` | `order_not_found_or_not_assigned` |
| `INVALID_STATUS_TRANSITION` | - | `invalid_status_transition` |
| `ONLY_DRIVERS_CAN_VIEW_ORDER_POOL` | `42501` | `pool_unauthorized` |
| `ONLY_DRIVERS_CAN_VIEW_HISTORY` | `42501` | `history_unauthorized` |
| Any unmapped error | - | `unexpected` |

---

## 4. Behavior & Invariants

1. **Development Logging**:
   - In `__DEV__`, classifier logs `[ErrorClassifier] Raw backend error:` with the underlying stack trace and error properties.
2. **Deterministic Fallback**:
   - The classifier never throws or returns undefined. If unidentifiable, it returns `{ kind: 'unexpected', originalError: error }`.
3. **Purity**:
   - Classifiers are synchronous, pure functions without network, UI, or store dependencies.
