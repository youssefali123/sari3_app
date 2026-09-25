import { supabase } from '@/shared/lib/supabase';
import { Product } from '../domain/entities/Product';
import { ProductAddOn } from '../domain/entities/ProductAddOn';
import { ProductRepository } from '../domain/repositories/ProductRepository';

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

interface AddOnRow {
  id: string;
  product_id: string;
  name: string;
  price: number;
  is_available: boolean | null;
  created_at: string | null;
}

function mapAddOn(row: AddOnRow): ProductAddOn {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    price: row.price,
    isAvailable: row.is_available ?? false,
    createdAt: row.created_at ?? '',
  };
}

export class SupabaseProductRepository implements ProductRepository {
  async getProductsByStore(storeId: string, categoryId?: string): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', storeId)
      .order('name');
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapProduct);
  }

  async getProductById(id: string): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return mapProduct(data as ProductRow);
  }

  async getAddOnsByProductId(productId: string): Promise<ProductAddOn[]> {
    const { data, error } = await supabase
      .from('product_add_ons')
      .select('*')
      .eq('product_id', productId)
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAddOn);
  }
}
