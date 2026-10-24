import { useQuery } from '@tanstack/react-query';
import { Department } from '../../domain/entities/Department';
import { DepartmentRepository } from '../../domain/repositories/DepartmentRepository';
import { SupabaseDepartmentRepository } from '../../infrastructure/SupabaseDepartmentRepository';

const departmentRepository: DepartmentRepository = new SupabaseDepartmentRepository();

export const DEPARTMENTS_QUERY_KEY = ['departments', 'active'] as const;

/**
 * Hook to fetch and cache active business departments using TanStack Query.
 * Owns all server state per Principle IV of Sari3 Constitution.
 */
export function useDepartments() {
  const query = useQuery({
    queryKey: DEPARTMENTS_QUERY_KEY,
    queryFn: () => departmentRepository.getActiveDepartments(),
    staleTime: 5 * 60 * 1000, // 5 minutes stale-while-revalidate
  });

  const departments: Department[] = query.data ?? [];
  const topDepartments = departments.slice(0, 6);

  return {
    departments,
    topDepartments,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
