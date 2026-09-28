import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/lib/supabase';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { AreaRepository } from '@/features/areas/domain/repositories/AreaRepository';
import { SupabaseAreaRepository } from '@/features/areas/infrastructure/SupabaseAreaRepository';

const areaRepository: AreaRepository = new SupabaseAreaRepository();

export interface DriverAreaAssignment {
  driverId: string;
  areaId: string;
  /** Resolved display name from the areas reference table. */
  areaName: string;
}

/**
 * The authenticated driver's explicit area assignments (feature 006 US4)
 * with display names resolved from the public areas reference table.
 * Read-scoped by RLS (driver_id = auth.uid()); zero rows means the driver is
 * regionally unassigned and the server will dispatch them no orders.
 */
export function useDriverAreas() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['driver', 'assignedAreas'],
    queryFn: async (): Promise<DriverAreaAssignment[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('driver_areas')
        .select('driver_id, area_id')
        .eq('driver_id', user.id);
      if (error) throw new Error(error.message);

      const rows = data ?? [];
      if (rows.length === 0) return [];

      // Resolve display names from the public areas tree.
      const areas = await areaRepository.getAreas();
      const nameById = new Map(areas.map((a) => [a.id, a.name]));
      return rows.map((row) => ({
        driverId: row.driver_id,
        areaId: row.area_id,
        areaName: nameById.get(row.area_id) ?? 'Unknown area',
      }));
    },
    enabled: Boolean(user),
  });

  const assignments = query.data ?? [];

  return {
    assignments,
    areaNames: assignments.map((a) => a.areaName),
    hasAssignedAreas: assignments.length > 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
