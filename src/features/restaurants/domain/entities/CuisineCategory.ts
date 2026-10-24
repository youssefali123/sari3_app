import { StoreType } from './Store';

/**
 * Pure domain entity representing a high-level food cuisine or store category.
 * Free of UI and transport frameworks (Constitution Principle II).
 */
export interface CuisineCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly imageUrl: string | null;
  readonly iconName: string | null;
  readonly displayOrder: number;
  readonly isActive: boolean;
  readonly type: StoreType;
}
