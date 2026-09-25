import { supabase } from '@/shared/lib/supabase';
import { Store, StoreType } from '../domain/entities/Store';
import { StoreCategory } from '../domain/entities/StoreCategory';
import { StoreRepository } from '../domain/repositories/StoreRepository';

interface RestaurantRow {
  id: string;
  name: string;
  type: StoreType | null;
  description: string | null;
  image_url: string | null;
  address: string | null;
  rating: number | null;
  is_open: boolean | null;
  created_at: string | null;
}

function mapStore(row: RestaurantRow): Store {
  return {
    id: row.id,
    name: row.name,
    type: row.type ?? 'restaurant',
    description: row.description,
    imageUrl: row.image_url,
    address: row.address ?? '',
    rating: row.rating,
    isOpen: row.is_open ?? false,
    createdAt: row.created_at ?? '',
  };
}

interface CategoryRow {
  id: string;
  store_id: string;
  name: string;
  display_order: number | null;
  created_at: string | null;
}

function mapCategory(row: CategoryRow): StoreCategory {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at ?? '',
  };
}

export class SupabaseStoreRepository implements StoreRepository {
  async getStores(type?: StoreType): Promise<Store[]> {
    let query = supabase.from('restaurants').select('*').order('name');
    if (type) {
      query = query.eq('type', type);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapStore);
  }

  async getStoreById(id: string): Promise<Store> {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return mapStore(data as RestaurantRow);
  }

  async getCategoriesByStoreId(storeId: string): Promise<StoreCategory[]> {
    const { data, error } = await supabase
      .from('store_categories')
      .select('*')
      .eq('store_id', storeId)
      .order('display_order');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCategory);
  }
}
