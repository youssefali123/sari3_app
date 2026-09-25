import { Product } from '../entities/Product';
import { ProductAddOn } from '../entities/ProductAddOn';

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
}
