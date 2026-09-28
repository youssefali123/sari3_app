import { Store, StoreType } from '../entities/Store';
import { StoreCategory } from '../entities/StoreCategory';

/**
 * Abstraction for store (restaurant/market) catalog data access.
 */
export interface StoreRepository {
  /**
   * List all active stores, optionally filtered by store type (restaurant or
   * market) and by exact area id (feature 006 regional browsing).
   */
  getStores(type?: StoreType, areaId?: string): Promise<Store[]>;

  /**
   * Retrieve a single store by its unique ID.
   */
  getStoreById(id: string): Promise<Store>;

  /**
   * Retrieve all product categories for a specific store, ordered by displayOrder.
   */
  getCategoriesByStoreId(storeId: string): Promise<StoreCategory[]>;
}
