import { useQuery } from '@tanstack/react-query';
import { Area } from '../../domain/entities/Area';
import { AreaRepository } from '../../domain/repositories/AreaRepository';
import { SupabaseAreaRepository } from '../../infrastructure/SupabaseAreaRepository';

const areaRepository: AreaRepository = new SupabaseAreaRepository();

/**
 * Area reference data for the drill-down picker. Publicly readable
 * (RLS areas_public_select), so guests can use it without signing in.
 */
export function useAreas() {
  const query = useQuery({
    queryKey: ['areas'],
    queryFn: () => areaRepository.getAreas(),
  });

  const areas = query.data ?? [];

  const topLevelAreas = areas.filter((a: Area) => a.parentAreaId === null);

  const getChildAreas = (parentId: string): Area[] =>
    areas.filter((a: Area) => a.parentAreaId === parentId);

  return {
    areas,
    topLevelAreas,
    getChildAreas,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
