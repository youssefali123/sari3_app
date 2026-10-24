import { Department } from '../entities/Department';

/**
 * Interface contract for department data access.
 * Pure TypeScript — domain layer (Principle II).
 */
export interface DepartmentRepository {
  /**
   * Fetches all active departments sorted by display_order ascending.
   */
  getActiveDepartments(): Promise<Department[]>;

  /**
   * Fetches a single department by its unique ID.
   */
  getDepartmentById(id: string): Promise<Department | null>;
}
