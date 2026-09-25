/**
 * Product category within a store, used for the category tab filter (FR-003).
 */
export interface StoreCategory {
  id: string;
  storeId: string;
  name: string;
  displayOrder: number;
  createdAt: string;
}
