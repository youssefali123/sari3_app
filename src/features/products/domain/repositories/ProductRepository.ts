import { Product } from '../entities/Product';
import { ProductAddOn } from '../entities/ProductAddOn';
import { ProductVariant } from '../entities/ProductVariant';

/**
 * Abstraction for product catalog data access.
 */
export interface ProductRepository {
  /**
   * Retrieve all products for a store, optionally filtered by category.
   */
  getProductsByStore(storeId: string, categoryId?: string): Promise<Product[]>;

  /**
   * Retrieve a single product by its unique ID.
   */
  getProductById(id: string): Promise<Product>;

  /**
   * Retrieve all available add-ons for a specific product.
   */
  getAddOnsByProductId(productId: string): Promise<ProductAddOn[]>;

  /**
   * Retrieve all variants (e.g. sizes) for a specific product. A non-empty
   * result means the product REQUIRES a variant choice when ordering.
   */
  getVariantsByProductId(productId: string): Promise<ProductVariant[]>;
}
