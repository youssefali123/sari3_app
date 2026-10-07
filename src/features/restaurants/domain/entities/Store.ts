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
  /** Free-text cuisine/category tag from the catalog (e.g. "برجر وفرايد تشيكن"). */
  category: string | null;
  /** Operational area the store belongs to (exact-match browsing, FR-004). */
  areaId: string;
  createdAt: string;
}

/**
 * Money helper type re-exported for convenience within the restaurants feature.
 */
export type StoreMoneyAmount = MoneyAmount;
