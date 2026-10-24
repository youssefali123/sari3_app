/**
 * Contract: Promotion and Deal Repository & UI Interfaces
 * Feature: 015-promotions-and-deals
 */

import { Promotion } from '@/features/promotions/domain/entities/Promotion';
import { DealProduct } from '@/features/products/domain/entities/DealProduct';
import { Product } from '@/features/products/domain/entities/Product';

/**
 * Promotional Banners Data Access Contract
 */
export interface PromotionRepositoryContract {
  /**
   * Retrieves active promotional banners ordered by display_order.
   * Collapses expired banners (where now() > expires_at) or inactive ones.
   */
  getActivePromotions(): Promise<Promotion[]>;
}

/**
 * Product Deals Data Access Contract (Extension to ProductRepository)
 */
export interface DealRepositoryContract {
  /**
   * Retrieves exclusive deal products scoped to a specific delivery area,
   * optionally filtered by department and limited in quantity.
   */
  getExclusiveDeals(params: {
    areaId: string;
    departmentId?: string | null;
    limit?: number;
  }): Promise<DealProduct[]>;
}

/**
 * UI Component Contracts
 */

export interface PromoBannerCarouselProps {
  /**
   * Optional manual promotions override; defaults to querying PromotionRepository.
   */
  promotions?: Promotion[];
}

export interface DealProductCardProps {
  deal: DealProduct;
  onPress: () => void;
  style?: object;
  testID?: string;
}

export interface DealsHorizontalCarouselProps {
  areaId: string | null;
  onViewAll: () => void;
  onSelectDeal: (deal: DealProduct) => void;
}
