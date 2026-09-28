import { SearchResult } from '../entities/SearchResult';

/**
 * Abstraction for unified catalog search. Publicly accessible — guests
 * search without authentication (feature 008 US2).
 */
export interface SearchRepository {
  /**
   * Search stores and products within an area by name similarity.
   * `query` should be at least 2 characters (enforced client-side).
   */
  search(areaId: string, query: string): Promise<SearchResult[]>;
}
