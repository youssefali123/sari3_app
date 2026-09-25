import { supabase } from '@/shared/lib/supabase';
import { Promotion, PromotionTargetType } from '../domain/entities/Promotion';
import { PromotionRepository } from '../domain/repositories/PromotionRepository';
import { Store } from '../../restaurants/domain/entities/Store';
import { Product } from '../../products/domain/entities/Product';
import { SupabaseStoreRepository } from '../../restaurants/infrastructure/SupabaseStoreRepository';
import { SupabaseProductRepository } from '../../products/infrastructure/SupabaseProductRepository';

interface PromotionRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  target_type: PromotionTargetType;
  is_active: boolean | null;
  display_order: number | null;
  starts_at: string | null;
  expires_at: string | null;
}

interface TargetRow {
  promotion_id: string;
  store_id: string | null;
  product_id: string | null;
}

const storeRepository = new SupabaseStoreRepository();
const productRepository = new SupabaseProductRepository();

export class SupabasePromotionRepository implements PromotionRepository {
  async getActivePromotions(): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .order('display_order');
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as PromotionRow[];
    if (rows.length === 0) return [];

    const { data: targets, error: targetsError } = await supabase
      .from('promotion_targets')
      .select('promotion_id, store_id, product_id')
      .in(
        'promotion_id',
        rows.map((r) => r.id),
      );
    if (targetsError) throw new Error(targetsError.message);

    const targetsByPromotion = new Map<string, string[]>();
    for (const target of (targets ?? []) as TargetRow[]) {
      const list = targetsByPromotion.get(target.promotion_id) ?? [];
      list.push((target.store_id ?? target.product_id) as string);
      targetsByPromotion.set(target.promotion_id, list);
    }

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.image_url,
      targetType: row.target_type,
      isActive: row.is_active ?? true,
      displayOrder: row.display_order ?? 0,
      startsAt: row.starts_at ?? '',
      expiresAt: row.expires_at,
      targetIds: targetsByPromotion.get(row.id) ?? [],
    }));
  }

  async getPromotionTargetItems(promotionId: string): Promise<{
    stores?: Store[];
    products?: Product[];
  }> {
    const { data: promotion, error } = await supabase
      .from('promotions')
      .select('target_type')
      .eq('id', promotionId)
      .single();
    if (error) throw new Error(error.message);

    const { data: targets, error: targetsError } = await supabase
      .from('promotion_targets')
      .select('store_id, product_id')
      .eq('promotion_id', promotionId);
    if (targetsError) throw new Error(targetsError.message);

    const rows = (targets ?? []) as TargetRow[];

    if (promotion.target_type === 'store') {
      const storeIds = rows
        .map((r) => r.store_id)
        .filter((id): id is string => id !== null);
      const stores = await Promise.all(storeIds.map((id) => storeRepository.getStoreById(id)));
      return { stores };
    }

    const productIds = rows
      .map((r) => r.product_id)
      .filter((id): id is string => id !== null);
    const products = await Promise.all(
      productIds.map((id) => productRepository.getProductById(id)),
    );
    return { products };
  }
}
