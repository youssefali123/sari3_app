/**
 * Active marketing banner on the home screen (FR-011, FR-012).
 */
export type PromotionTargetType = 'store' | 'product';

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  targetType: PromotionTargetType;
  isActive: boolean;
  displayOrder: number;
  startsAt: string;
  expiresAt: string | null;
  /** List of store IDs or product IDs promoted by this banner. */
  targetIds: string[];
}
