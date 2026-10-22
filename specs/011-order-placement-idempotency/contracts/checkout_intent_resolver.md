# Contract: Checkout Intent Resolver

**Module**: `src/features/cart/application/checkoutIntentResolver.ts`
**Layer**: Application (Pure TypeScript — No React, Expo, AsyncStorage, or Supabase dependencies)

---

## 1. Intent Fingerprint Function

Computes a deterministic, order-independent string representation of the purchase details.

```typescript
export interface FingerprintInput {
  storeId: string;
  deliveryAddressId: string;
  couponCode?: string | null;
  items: {
    productId: string;
    variantId?: string | null;
    quantity: number;
    addonIds: string[];
  }[];
}

export function computeIntentFingerprint(input: FingerprintInput): string;
```

### Fingerprint Format
```
${storeId}::${deliveryAddressId}::${couponCode ?? ''}::${itemSignatures.sort().join('|')}
```
Where each `itemSignature` is:
`${productId}:${variantId ?? ''}:${quantity}:${addonIds.slice().sort().join(',')}`

---

## 2. Intent Resolver Function

Determines whether to reuse an existing stored key or generate a fresh key upon checkout confirmation.

```typescript
export interface ResolveIntentInput {
  currentFingerprint: string;
  storedIntent: { idempotencyKey: string; intentFingerprint: string } | null;
  generateKey: () => string; // Injected UUID generator (e.g., from expo-crypto)
}

export interface ResolveIntentResult {
  idempotencyKey: string;
  intentFingerprint: string;
  isReused: boolean;
}

export function resolveCheckoutIntent(input: ResolveIntentInput): ResolveIntentResult {
  const { currentFingerprint, storedIntent, generateKey } = input;

  if (storedIntent && storedIntent.intentFingerprint === currentFingerprint) {
    return {
      idempotencyKey: storedIntent.idempotencyKey,
      intentFingerprint: storedIntent.intentFingerprint,
      isReused: true,
    };
  }

  const newKey = generateKey();
  return {
    idempotencyKey: newKey,
    intentFingerprint: currentFingerprint,
    isReused: false,
  };
}
```

---

## 3. Unit Test Invariants

1. Same fingerprint with an existing stored intent → Returns the stored `idempotencyKey`, `isReused === true`, `generateKey` is not invoked.
2. Different fingerprint with an existing stored intent → Calls `generateKey()`, returns new key and new fingerprint, `isReused === false`.
3. Null `storedIntent` → Calls `generateKey()`, returns new key, `isReused === false`.
4. Order of items or add-on IDs in input does not alter the fingerprint (deterministic sorting).
