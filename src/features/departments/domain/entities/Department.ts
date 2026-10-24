/**
 * Department domain entity representing a top-level business vertical.
 * Pure TypeScript — zero dependencies on frameworks (Principle II).
 */
export interface Department {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  iconName: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}
