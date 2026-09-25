import { Store, StoreType } from '../entities/Store';
import { StoreCategory } from '../entities/StoreCategory';

/**
 * Abstraction for store (restaurant/market) catalog data access.
 */
export interface StoreRepository {
  /**
   * List all active stores, optionally filtered by type (restaurant or market).
   */
  getStores(type?: StoreType): Promise<Store[]>;

  /**
   * Retrieve a single store by its unique ID.
   */
  getStoreById(id: string): Promise<Store>;

  /**
   * Retrieve all product categories for a specific store, ordered by displayOrder.
   */
  getCategoriesByStoreId(storeId: string): Promise<StoreCategory[]>;
}
