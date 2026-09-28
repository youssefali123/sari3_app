import { Area } from '../entities/Area';

/**
 * Abstraction for area reference data access. Publicly accessible by
 * anonymous and authenticated users (RLS: SELECT for all, no writes).
 */
export interface AreaRepository {
  /**
   * Fetches all operational areas.
   */
  getAreas(): Promise<Area[]>;
}
