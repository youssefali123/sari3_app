/**
 * Customer favorites. Stores and products are favorited independently
 * (CAP-005, CAP-006, FR-008, FR-009, FR-010).
 */
export interface FavoriteStore {
  customerId: string;
  storeId: string;
  createdAt: string;
}

export interface FavoriteProduct {
  customerId: string;
  productId: string;
  createdAt: string;
}
