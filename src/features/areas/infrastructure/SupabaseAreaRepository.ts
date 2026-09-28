import { supabase } from '@/shared/lib/supabase';
import { Area } from '../domain/entities/Area';
import { AreaRepository } from '../domain/repositories/AreaRepository';

interface AreasRow {
  id: string;
  name: string;
  parent_area_id: string | null;
  created_at: string;
}

function mapArea(row: AreasRow): Area {
  return {
    id: row.id,
    name: row.name,
    parentAreaId: row.parent_area_id,
    createdAt: row.created_at,
  };
}

/**
 * Supabase implementation of area reference data access. Public read
 * (RLS areas_public_select); no client writes exist.
 */
export class SupabaseAreaRepository implements AreaRepository {
  async getAreas(): Promise<Area[]> {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapArea);
  }
}
