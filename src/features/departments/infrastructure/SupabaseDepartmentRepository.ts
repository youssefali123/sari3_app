import { supabase } from '@/shared/lib/supabase';
import { Department } from '../domain/entities/Department';
import { DepartmentRepository } from '../domain/repositories/DepartmentRepository';
import { DepartmentsRow } from '@/shared/types/supabase';

function mapDepartment(row: DepartmentsRow): Department {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    imageUrl: row.image_url,
    iconName: row.icon_name,
    displayOrder: row.display_order,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

/**
 * Supabase-backed implementation of DepartmentRepository.
 * Follows Principle III & Principle V.
 */
export class SupabaseDepartmentRepository implements DepartmentRepository {
  async getActiveDepartments(): Promise<Department[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch departments: ${error.message}`);
    }

    return (data ?? []).map(mapDepartment);
  }

  async getDepartmentById(id: string): Promise<Department | null> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch department by id: ${error.message}`);
    }

    if (!data) return null;
    return mapDepartment(data);
  }
}
