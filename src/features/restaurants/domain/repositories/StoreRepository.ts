import { Store, StoreType } from '../entities/Store';
import { StoreCategory } from '../entities/StoreCategory';
import { CuisineCategory } from '../entities/CuisineCategory';

/**
 * Abstraction for store (restaurant/market) catalog data access.
 */
export interface StoreRepository {
  /**
   * List all active stores, optionally filtered by store type, area id,
   * and department id (feature 014 dynamic categories).
   */
  getStores(type?: StoreType, areaId?: string, departmentId?: string): Promise<Store[]>;

  /**
   * Retrieve a single store by its unique ID.
   */
  getStoreById(id: string): Promise<Store>;

  /**
   * Retrieve all product categories for a specific store, ordered by displayOrder.
   */
  getCategoriesByStoreId(storeId: string): Promise<StoreCategory[]>;

  /**
   * Retrieve all active visual cuisine categories, ordered by displayOrder,
   * optionally scoped to restaurants present in a specific area and/or department.
   */
  getCuisineCategories(
    type?: StoreType,
    areaId?: string,
    departmentId?: string
  ): Promise<CuisineCategory[]>;

  /**
   * Retrieve stores belonging to a specific cuisine category, optionally scoped by area.
   */
  getStoresByCuisineCategory(categoryId: string, areaId?: string): Promise<Store[]>;
}
