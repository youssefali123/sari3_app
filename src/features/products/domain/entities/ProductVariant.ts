import { MoneyAmount } from '@/shared/types/common';

/**
 * A purchasable size/option variant of a product (e.g. "Small"/"Large" pizza).
 * A product with at least one available variant REQUIRES a variant choice at
 * order time; the variant price replaces the product's base price.
 */
export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  price: MoneyAmount;
  isAvailable: boolean;
  displayOrder: number;
}
