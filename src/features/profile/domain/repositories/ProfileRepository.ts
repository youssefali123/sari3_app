import { UserProfile } from '../entities/UserProfile';

/**
 * Input for updating a user's profile.
 */
export interface UpdateProfileInput {
  fullName?: string;
  phone?: string;
  avatarUrl?: string;
}

/** Thrown when no profiles row exists for the given user id (trigger failure or database inconsistency). */
export class ProfileNotFoundError extends Error {
  constructor() {
    super('Profile not found for the authenticated user.');
    this.name = 'ProfileNotFoundError';
  }
}

/**
 * Abstraction for user profile data access.
 */
export interface ProfileRepository {
  getProfile(userId: string): Promise<UserProfile>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile>;
}
