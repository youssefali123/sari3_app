import { UserRole } from '@/features/auth/domain/entities/AuthUser';

/**
 * The user's application profile, mapped from the `profiles` table.
 *
 * This is the AUTHORITATIVE source for the application role. Never read the
 * role from AuthUser (which has none) or from user-editable auth metadata —
 * the profiles row is provisioned server-side and role changes are
 * out-of-band only.
 */
export interface UserProfile {
  id: string;
  fullName: string;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
