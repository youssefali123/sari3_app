/**
 * Pure Application layer functions for computing purchase intent fingerprints
 * and resolving idempotency keys for order placement.
 *
 * NOTE: Absolutely zero imports of React, Expo, AsyncStorage, or Supabase
 * are permitted in this module per the project constitution.
 */

export interface FingerprintItem {
  productId: string;
  variantId?: string | null;
  quantity: number;
  addonIds: string[];
}

export interface FingerprintInput {
  storeId: string;
  deliveryAddressId: string;
  couponCode?: string | null;
  items: FingerprintItem[];
}

export interface StoredIntent {
  idempotencyKey: string;
  intentFingerprint: string;
}

export interface ResolveIntentInput {
  currentFingerprint: string;
  storedIntent: StoredIntent | null;
  generateKey: () => string;
}

export interface ResolveIntentResult {
  idempotencyKey: string;
  intentFingerprint: string;
  isReused: boolean;
}

/**
 * Computes a deterministic, order-independent string representation of the purchase details.
 * Item ordering and add-on ordering within items are canonicalized via sorting.
 */
export function computeIntentFingerprint(input: FingerprintInput): string {
  const normalizedCoupon = (input.couponCode ?? '').trim().toUpperCase();

  const itemSignatures = input.items.map((item) => {
    const variant = item.variantId ?? '';
    const sortedAddons = [...item.addonIds].sort().join(',');
    return `${item.productId}:${variant}:${item.quantity}:${sortedAddons}`;
  });

  itemSignatures.sort();

  return `${input.storeId}::${input.deliveryAddressId}::${normalizedCoupon}::${itemSignatures.join('|')}`;
}

/**
 * Determines whether to reuse an existing active checkout intent key or generate a fresh key.
 * If the current purchase fingerprint matches the stored intent's fingerprint, the key is reused.
 * Otherwise, the injected UUID generator is invoked to create a fresh key.
 */
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
