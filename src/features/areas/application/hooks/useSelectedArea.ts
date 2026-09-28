import { useCallback, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/lib/store';
import { useAuth } from '@/features/auth/application/hooks/useAuth';
import { AreaRepository } from '../../domain/repositories/AreaRepository';
import { SupabaseAreaRepository } from '../../infrastructure/SupabaseAreaRepository';
import { ProfileRepository } from '@/features/profile/domain/repositories/ProfileRepository';
import { SupabaseProfileRepository } from '@/features/profile/infrastructure/SupabaseProfileRepository';
import { selectArea, setArea } from '../areaSlice';

const areaRepository: AreaRepository = new SupabaseAreaRepository();
const profileRepository: ProfileRepository = new SupabaseProfileRepository();

/**
 * Area selection state (feature 006 US2, dual ownership):
 * - Redux owns the active selection for the browsing UI (works for guests).
 * - Authenticated customers: every change also persists to
 *   profiles.selected_area_id via ProfileRepository (server-authoritative;
 *   RLS profiles_update_own scopes the write).
 * - The profile↔Redux reconciliation runs ONCE per login (FR-015/FR-016):
 *   a guest's pending selection migrates to their fresh profile, or the
 *   profile's saved area is restored. After that one-time sync, Redux is
 *   the live source of truth — later changes persist fire-and-forget and
 *   are never reverted by a stale in-memory profile.
 */
export function useSelectedArea() {
  const dispatch = useAppDispatch();
  const { user, profile } = useAuth();
  const area = useAppSelector(selectArea);
  const syncedUserIdRef = useRef<string | null>(null);

  // One-time reconciliation per login/session.
  useEffect(() => {
    if (!user || !profile) return;
    if (syncedUserIdRef.current === user.id) return;
    syncedUserIdRef.current = user.id;

    if (profile.selectedAreaId) {
      if (profile.selectedAreaId !== area.selectedAreaId) {
        // Profile wins at login: restore the saved area (resolve its name).
        areaRepository
          .getAreas()
          .then((areas) => {
            const saved = areas.find((a) => a.id === profile.selectedAreaId);
            dispatch(
              setArea({
                id: profile.selectedAreaId!,
                name: saved?.name ?? 'Selected area',
              }),
            );
          })
          .catch(() => undefined);
      }
    } else if (area.selectedAreaId) {
      // Guest selection migrates to the fresh profile (FR-016).
      profileRepository
        .updateProfile(user.id, { selectedAreaId: area.selectedAreaId })
        .catch(() => undefined);
    }
  }, [user, profile, area.selectedAreaId, dispatch]);

  const setSelectedArea = useCallback(
    async (selected: { id: string; name: string }) => {
      dispatch(setArea(selected));
      // Persist for authenticated customers; guests keep Redux-only state
      // and their selection migrates to the profile on login (FR-016).
      if (user) {
        try {
          await profileRepository.updateProfile(user.id, { selectedAreaId: selected.id });
        } catch {
          // Persistence failure must not break browsing; retried on next change.
        }
      }
    },
    [user, dispatch],
  );

  return {
    selectedAreaId: area.selectedAreaId,
    selectedAreaName: area.selectedAreaName,
    setSelectedArea,
    isLoading: false,
  };
}
