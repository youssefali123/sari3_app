import { supabase } from '@/shared/lib/supabase';
import type { Database } from '@/shared/types/supabase';
import { UserProfile } from '../domain/entities/UserProfile';
import {
  ProfileRepository,
  ProfileNotFoundError,
  UpdateProfileInput,
} from '../domain/repositories/ProfileRepository';

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];

function mapProfile(row: ProfilesRow): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name ?? '',
    // The DB enum also carries 'admin' (unused by the app); the domain only
    // knows the two application roles.
    role: row.role === 'driver' ? 'driver' : 'customer',
    phone: row.phone,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Supabase implementation of the ProfileRepository contract.
 * Reads are customer-scoped by RLS (auth.uid() = id).
 */
export class SupabaseProfileRepository implements ProfileRepository {
  async getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, phone, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ProfileNotFoundError();
      }
      throw new Error(error.message);
    }
    return mapProfile(data as ProfilesRow);
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...(input.fullName !== undefined ? { full_name: input.fullName } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('id, full_name, role, phone, avatar_url, created_at, updated_at')
      .single();

    if (error) throw new Error(error.message);
    return mapProfile(data as ProfilesRow);
  }
}
