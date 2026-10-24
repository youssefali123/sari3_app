/**
 * Repository and Service Contracts: Departments & Store Browsing
 * Feature: 014-dynamic-home-categories
 */

import { Department } from '@/features/departments/domain/entities/Department';
import { Store } from '@/features/restaurants/domain/entities/Store';

/**
 * Interface contract for fetching departments.
 * Lives in domain layer: pure TypeScript, zero external framework imports.
 */
export interface DepartmentRepository {
  /**
   * Fetches all active departments ordered by display_order ascending.
   */
  getActiveDepartments(): Promise<Department[]>;

  /**
   * Fetches a single department by its ID or slug.
   */
  getDepartmentById(id: string): Promise<Department | null>;
}

/**
 * Extended StoreRepository contract supporting department filtering.
 */
export interface ExtendedStoreRepositoryContract {
  /**
   * Fetches stores filtered optionally by department and area.
   */
  getStores(
    type?: 'restaurant' | 'market',
    areaId?: string,
    departmentId?: string
  ): Promise<Store[]>;
}

/**
 * Route parameter contract for navigation.
 */
export interface BrowseRouteParams {
  departmentId?: string;
  departmentName?: string;
  type?: 'restaurant' | 'market'; // Legacy fallback
  categoryId?: string; // Sub-category filter
}
