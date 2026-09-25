import { MoneyAmount } from '@/shared/types/common';

/**
 * Unified store type: both restaurants and markets share one model (BR-001).
 */
export type StoreType = 'restaurant' | 'market';

/**
 * Represents a store (restaurant or market) in the unified catalog.
 */
export interface Store {
  id: string;
  name: string;
  type: StoreType;
  description: string | null;
  imageUrl: string | null;
  address: string;
  /** Rating between 0.0 and 5.0, or null when not yet rated. */
  rating: number | null;
  isOpen: boolean;
  createdAt: string;
}

/**
 * Money helper type re-exported for convenience within the restaurants feature.
 */
export type StoreMoneyAmount = MoneyAmount;
