import { Store } from '../../../restaurants/domain/entities/Store';
import { Product } from '../../../products/domain/entities/Product';

/**
 * Abstraction for store and product favorites management.
 */
export interface FavoritesRepository {
  /**
   * Retrieve all stores favorited by the current customer.
   */
  getFavoriteStores(customerId: string): Promise<Store[]>;

  /**
   * Retrieve all products favorited by the current customer.
   */
  getFavoriteProducts(customerId: string): Promise<Product[]>;

  /**
   * Add a store to the customer's favorites.
   */
  addFavoriteStore(customerId: string, storeId: string): Promise<void>;

  /**
   * Remove a store from the customer's favorites.
   */
  removeFavoriteStore(customerId: string, storeId: string): Promise<void>;

  /**
   * Add a product to the customer's favorites.
   */
  addFavoriteProduct(customerId: string, productId: string): Promise<void>;

  /**
   * Remove a product from the customer's favorites.
   */
  removeFavoriteProduct(customerId: string, productId: string): Promise<void>;
}
