import { MoneyAmount } from '@/shared/types/common';

/**
 * Optional binary modifier for a product (max quantity 1, BR-003).
 */
export interface ProductAddOn {
  id: string;
  productId: string;
  name: string;
  price: MoneyAmount;
  isAvailable: boolean;
  createdAt: string;
}
