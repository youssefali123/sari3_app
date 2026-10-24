import { supabase } from '@/shared/lib/supabase';
import { Store, StoreType } from '../domain/entities/Store';
import { StoreCategory } from '../domain/entities/StoreCategory';
import { CuisineCategory } from '../domain/entities/CuisineCategory';
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
  category: string | null;
  area_id: string;
  department_id?: string | null;
  departments?: { name: string } | null;
  created_at: string | null;
  restaurant_categories?: {
    categories: CuisineCategoryRow | null;
  }[];
}

const STORE_SELECT_FIELDS = '*, departments(name), restaurant_categories(categories(*))';

function mapStore(row: RestaurantRow): Store {
  const categories = row.restaurant_categories
    ? row.restaurant_categories
        .map((rc) => rc.categories)
        .filter((c): c is CuisineCategoryRow => c !== null)
        .map(mapCuisineCategory)
    : undefined;

  return {
    id: row.id,
    name: row.name,
    type: row.type ?? 'restaurant',
    description: row.description,
    imageUrl: row.image_url,
    address: row.address ?? '',
    rating: row.rating,
    isOpen: row.is_open ?? false,
    category: row.category,
    categories: categories && categories.length > 0 ? categories : undefined,
    areaId: row.area_id,
    departmentId: row.department_id ?? null,
    departmentName: row.departments?.name ?? null,
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

interface CuisineCategoryRow {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  icon_name: string | null;
  display_order: number | null;
  is_active: boolean | null;
  type: StoreType | null;
}

function mapCuisineCategory(row: CuisineCategoryRow): CuisineCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url,
    iconName: row.icon_name,
    displayOrder: row.display_order ?? 0,
    isActive: row.is_active ?? true,
    type: row.type ?? 'restaurant',
  };
}

export class SupabaseStoreRepository implements StoreRepository {
  async getStores(type?: StoreType, areaId?: string, departmentId?: string): Promise<Store[]> {
    let query = supabase.from('restaurants').select(STORE_SELECT_FIELDS).order('name');
    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else if (type) {
      query = query.eq('type', type);
    }
    if (areaId) {
      // Exact-match regional browsing (feature 006 FR-013) — no rollups.
      query = query.eq('area_id', areaId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapStore(row as unknown as RestaurantRow));
  }

  async getStoreById(id: string): Promise<Store> {
    const { data, error } = await supabase
      .from('restaurants')
      .select(STORE_SELECT_FIELDS)
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return mapStore(data as unknown as RestaurantRow);
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

  async getCuisineCategories(
    type?: StoreType,
    areaId?: string,
    departmentId?: string
  ): Promise<CuisineCategory[]> {
    if (areaId) {
      let query = supabase
        .from('categories')
        .select('*, restaurant_categories!inner(restaurant_id, restaurant:restaurants!inner(area_id))')
        .eq('is_active', true)
        .eq('restaurant_categories.restaurant.area_id', areaId)
        .order('display_order', { ascending: true });

      if (departmentId) {
        query = query.eq('department_id', departmentId);
      } else if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => mapCuisineCategory(row as unknown as CuisineCategoryRow));
    }

    let query = supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    } else if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapCuisineCategory);
  }

  async getStoresByCuisineCategory(categoryId: string, areaId?: string): Promise<Store[]> {
    const { data: linkData, error: linkError } = await supabase
      .from('restaurant_categories')
      .select('restaurant_id')
      .eq('category_id', categoryId);

    if (linkError) throw new Error(linkError.message);
    const storeIds = (linkData ?? []).map((row) => row.restaurant_id);
    if (storeIds.length === 0) return [];

    let query = supabase
      .from('restaurants')
      .select(STORE_SELECT_FIELDS)
      .in('id', storeIds)
      .order('name');

    if (areaId) {
      query = query.eq('area_id', areaId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapStore(row as unknown as RestaurantRow));
  }
}
