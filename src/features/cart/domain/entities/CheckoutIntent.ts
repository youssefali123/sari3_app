/**
 * Client-side representation of a pending or active checkout attempt.
 * Persisted alongside the shopping cart state to survive app kills.
 */
export interface CheckoutIntent {
  /** Deterministic UUID identifying this specific checkout attempt. */
  idempotencyKey: string;
  /** Serialized fingerprint of store, items, address, and coupon. */
  intentFingerprint: string;
}
