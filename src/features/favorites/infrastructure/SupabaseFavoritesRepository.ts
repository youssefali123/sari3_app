import { supabase } from '@/shared/lib/supabase';
import { queryClient } from '@/shared/lib/queryClient';
import { Store } from '../../restaurants/domain/entities/Store';
import { Product } from '../../products/domain/entities/Product';
import { FavoritesRepository } from '../domain/repositories/FavoritesRepository';

interface RestaurantRow {
  id: string;
  name: string;
  type: 'restaurant' | 'market' | null;
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

interface ProductRow {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean | null;
  created_at: string | null;
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    storeId: row.restaurant_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    price: row.price,
    imageUrl: row.image_url,
    isAvailable: row.is_available ?? false,
    createdAt: row.created_at ?? '',
  };
}

/**
 * Favorites via favorite_stores / favorite_products, with TanStack Query
 * cache invalidation after every mutation.
 */
export class SupabaseFavoritesRepository implements FavoritesRepository {
  async getFavoriteStores(customerId: string): Promise<Store[]> {
    const { data, error } = await supabase
      .from('favorite_stores')
      .select('store_id, restaurants(*)')
      .eq('customer_id', customerId);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((row) => row.restaurants as unknown as RestaurantRow | null)
      .filter((r): r is RestaurantRow => r !== null)
      .map(mapStore);
  }

  async getFavoriteProducts(customerId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('favorite_products')
      .select('product_id, products(*)')
      .eq('customer_id', customerId);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((row) => row.products as unknown as ProductRow | null)
      .filter((p): p is ProductRow => p !== null)
      .map(mapProduct);
  }

  async addFavoriteStore(customerId: string, storeId: string): Promise<void> {
    const { error } = await supabase
      .from('favorite_stores')
      .insert({ customer_id: customerId, store_id: storeId });
    if (error) throw new Error(error.message);
    queryClient.invalidateQueries({ queryKey: ['favoriteStores'] });
    queryClient.invalidateQueries({ queryKey: ['favoriteStoreIds'] });
  }

  async removeFavoriteStore(customerId: string, storeId: string): Promise<void> {
    const { error } = await supabase
      .from('favorite_stores')
      .delete()
      .eq('customer_id', customerId)
      .eq('store_id', storeId);
    if (error) throw new Error(error.message);
    queryClient.invalidateQueries({ queryKey: ['favoriteStores'] });
    queryClient.invalidateQueries({ queryKey: ['favoriteStoreIds'] });
  }

  async addFavoriteProduct(customerId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('favorite_products')
      .insert({ customer_id: customerId, product_id: productId });
    if (error) throw new Error(error.message);
    queryClient.invalidateQueries({ queryKey: ['favoriteProducts'] });
    queryClient.invalidateQueries({ queryKey: ['favoriteProductIds'] });
  }

  async removeFavoriteProduct(customerId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('favorite_products')
      .delete()
      .eq('customer_id', customerId)
      .eq('product_id', productId);
    if (error) throw new Error(error.message);
    queryClient.invalidateQueries({ queryKey: ['favoriteProducts'] });
    queryClient.invalidateQueries({ queryKey: ['favoriteProductIds'] });
  }
}
