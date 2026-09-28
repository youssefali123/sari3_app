/**
 * A single row in the unified catalog search results (feature 008).
 * Discriminated union: check `resultType` to know which variant applies.
 */
export interface StoreSearchResult {
  resultType: 'store';
  id: string;
  name: string;
  imageUrl: string | null;
  similarityScore: number;
  isOpen: boolean;
}

export interface ProductSearchResult {
  resultType: 'product';
  id: string;
  name: string;
  imageUrl: string | null;
  similarityScore: number;
  /** Parent store the product belongs to. */
  storeId: string;
  storeName: string;
}

export type SearchResult = StoreSearchResult | ProductSearchResult;
