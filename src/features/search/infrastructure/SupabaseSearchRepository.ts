import { supabase } from '@/shared/lib/supabase';
import { SearchResult } from '../domain/entities/SearchResult';
import { SearchRepository } from '../domain/repositories/SearchRepository';

interface SearchCatalogRow {
  result_type: 'store' | 'product';
  id: string;
  name: string;
  image_url: string | null;
  similarity_score: number;
  store_id: string | null;
  store_name: string | null;
  is_open: boolean | null;
}

function mapRow(row: SearchCatalogRow): SearchResult {
  if (row.result_type === 'store') {
    return {
      resultType: 'store',
      id: row.id,
      name: row.name,
      imageUrl: row.image_url,
      similarityScore: Number(row.similarity_score),
      isOpen: row.is_open ?? false,
    };
  }
  return {
    resultType: 'product',
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    similarityScore: Number(row.similarity_score),
    storeId: row.store_id ?? '',
    storeName: row.store_name ?? '',
  };
}

/**
 * Supabase implementation of unified catalog search via the
 * search_catalog RPC (SECURITY INVOKER — guest RLS context applies).
 */
export class SupabaseSearchRepository implements SearchRepository {
  async search(areaId: string, query: string): Promise<SearchResult[]> {
    const { data, error } = await supabase.rpc('search_catalog', {
      p_area_id: areaId,
      p_query: query,
    });
    if (error) throw new Error(error.message);
    return ((data ?? []) as SearchCatalogRow[]).map(mapRow);
  }
}
