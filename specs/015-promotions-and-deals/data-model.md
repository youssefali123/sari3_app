# Data Model: Dynamic Promotional Banners & Product Exclusive Deals

**Feature**: `015-promotions-and-deals`  
**Date**: 2026-10-24  
**Status**: Completed  

---

## 1. Database Schema

### 1.1 `public.promotions` (Updated)

Represents promotional banners displayed in the auto-sliding carousel at the top of the home screen.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `UUID` | No | `gen_random_uuid()` | Primary key |
| `title` | `TEXT` | No | - | Marketing campaign title / banner title |
| `description` | `TEXT` | Yes | `NULL` | Optional subtitle or marketing copy |
| `image_url` | `TEXT` | No | - | High-resolution banner image URL (Unsplash or Supabase Storage) |
| `target_type` | `TEXT` | No | `'store'` | `'store'`, `'product'`, or `'announcement'` |
| `store_id` | `UUID` | Yes | `NULL` | Foreign key referencing `public.restaurants(id) ON DELETE SET NULL`. If present, banner tap navigates to `/store/[store_id]`. If null, banner is informational only. |
| `is_active` | `BOOLEAN` | No | `true` | Admin toggle for banner visibility |
| `display_order` | `INTEGER` | No | `0` | Sort order in the carousel (ascending) |
| `starts_at` | `TIMESTAMPTZ` | No | `now()` | Campaign start timestamp |
| `expires_at` | `TIMESTAMPTZ` | Yes | `NULL` | Campaign expiration timestamp (auto-expires when `now() > expires_at`) |
| `created_at` | `TIMESTAMPTZ` | No | `now()` | Row creation timestamp |

#### Constraints & Indexes
```sql
ALTER TABLE public.promotions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_promotions_active_order ON public.promotions (is_active, display_order) WHERE is_active = true;
```

---

### 1.2 `public.products` (Updated)

Extended catalog item supporting discounted deal pricing.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| *(existing columns)* | ... | ... | ... | `id`, `restaurant_id`, `category_id`, `name`, `description`, `price`, `image_url`, `is_available`, `created_at` |
| `original_price` | `INTEGER` | Yes | `NULL` | Strikethrough price in piasters before discount (must be > 0 if provided) |
| `is_deal` | `BOOLEAN` | No | Generated | `GENERATED ALWAYS AS (original_price IS NOT NULL AND original_price > price) STORED` |

#### Constraints & Indexes
```sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price INTEGER;
ALTER TABLE public.products ADD CONSTRAINT products_original_price_positive CHECK (original_price IS NULL OR original_price > 0);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_deal BOOLEAN GENERATED ALWAYS AS (original_price IS NOT NULL AND original_price > price) STORED;
CREATE INDEX IF NOT EXISTS idx_products_active_deals ON public.products (restaurant_id, is_available) WHERE is_deal = true AND is_available = true;
```

---

## 2. TypeScript Domain Entities

### 2.1 `Promotion` (`src/features/promotions/domain/entities/Promotion.ts`)

```typescript
export type PromotionTargetType = 'store' | 'product' | 'announcement';

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  targetType: PromotionTargetType;
  storeId?: string | null;
  isActive: boolean;
  displayOrder: number;
  startsAt: string;
  expiresAt: string | null;
  targetIds?: string[];
}
```

### 2.2 `Product` (`src/features/products/domain/entities/Product.ts` - Extended)

```typescript
import { MoneyAmount } from '@/shared/types/common';

export interface Product {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: MoneyAmount;
  originalPrice?: MoneyAmount | null;
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
}
```

### 2.3 `DealProduct` (`src/features/products/domain/entities/DealProduct.ts`)

Represents a product active deal enriched with merchant metadata for carousels and grid listings.

```typescript
import { Product } from './Product';

export interface DealProduct extends Product {
  originalPrice: number; // strictly guaranteed > price
  discountPercentage: number; // Math.round(((originalPrice - price) / originalPrice) * 100)
  storeName: string;
  storeRating: number | null;
  storeIsOpen: boolean;
  departmentId: string | null;
}
```

---

## 3. Validation & Business Rules

1. **Deal Qualification Rule**:
   - A product qualifies as an active deal if and only if:
     `product.originalPrice != null && product.originalPrice > product.price && product.isAvailable === true && store.isOpen === true` (or store delivers to customer's area).
2. **Discount Percentage Calculation**:
   $$\text{discountPercentage} = \text{Math.round}\left(\frac{\text{originalPrice} - \text{price}}{\text{originalPrice}} \times 100\right)$$
   - Must produce an integer between $1$ and $99$.
   - Displayed with Arabic prefix: `خصم ${discountPercentage}%` (e.g. `خصم 20%`).
3. **Banner Navigation Targeting**:
   - If `banner.storeId` is non-empty string: clicking triggers `router.push('/store/' + banner.storeId)`.
   - If `banner.storeId` is null/undefined: clicking is disabled (no navigation, no ripple/press feedback).
4. **Area Scoping Rule**:
   - Deals queries MUST filter on `restaurants.area_id = selectedAreaId`.
   - If `selectedAreaId` is null, deal queries are disabled (`enabled: Boolean(selectedAreaId)`).
