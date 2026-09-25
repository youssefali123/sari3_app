import { Promotion } from '../entities/Promotion';
import { Store } from '../../../restaurants/domain/entities/Store';
import { Product } from '../../../products/domain/entities/Product';

/**
 * Abstraction for promotion data access.
 */
export interface PromotionRepository {
  /**
   * Retrieve all currently active promotional offers for the home screen.
   */
  getActivePromotions(): Promise<Promotion[]>;

  /**
   * Retrieve the promoted stores or products associated with a promotion.
   */
  getPromotionTargetItems(promotionId: string): Promise<{
    stores?: Store[];
    products?: Product[];
  }>;
}
