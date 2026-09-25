import { MoneyAmount } from '@/shared/types/common';

/**
 * Catalog item belonging to a store and an optional category.
 * Prices are integer piasters, non-negative (server is authoritative).
 */
export interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: MoneyAmount;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
}
