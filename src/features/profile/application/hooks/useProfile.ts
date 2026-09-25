import { useQuery } from '@tanstack/react-query';
import { ProfileRepository } from '../../domain/repositories/ProfileRepository';
import { SupabaseProfileRepository } from '../../infrastructure/SupabaseProfileRepository';

const profileRepository: ProfileRepository = new SupabaseProfileRepository();

/**
 * TanStack Query hook for profile data outside the AuthContext (the context
 * owns the session; this is a server-state read of the profiles row).
 */
export function useProfile(userId: string | null | undefined) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile', userId],
    queryFn: () => profileRepository.getProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });

  return { profile: data, isLoading, isError, refetch };
}
