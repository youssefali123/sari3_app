/**
 * The authenticated identity (from Supabase Auth).
 *
 * Identity-only: this entity carries no application role. The authoritative
 * role lives in UserProfile (fetched from the profiles table), never here.
 */
export interface AuthUser {
  id: string;
  email: string;
}

/**
 * A user's role in the application.
 * Self-registration always yields 'customer'; 'driver' is provisioned
 * out-of-band via the Supabase dashboard.
 */
export type UserRole = 'customer' | 'driver';
