# API Contract: Authentication & Profile

**Feature**: 002-auth-and-onboarding | **Date**: 2026-09-19

This document defines the interface contracts between the app and Supabase Auth/Database services. These are the external boundaries of the auth feature.

## 1. Supabase Auth API (consumed by `SupabaseAuthRepository`)

### Sign Up

```typescript
// Input
supabase.auth.signUp({
  email: string,
  password: string,
  options: {
    data: {
      full_name: string  // Stored in raw_user_meta_data, read by profile trigger
    }
  }
})

// Success Response
{
  data: {
    user: User,       // Supabase User object with id, email, etc.
    session: Session   // Contains access_token, refresh_token
  },
  error: null
}

// Error Responses
{
  data: { user: null, session: null },
  error: {
    message: 'User already registered',  // Duplicate email
    status: 422
  }
}
{
  data: { user: null, session: null },
  error: {
    message: 'Password should be at least 6 characters',  // Weak password
    status: 422
  }
}
```

### Sign In

```typescript
// Input
supabase.auth.signInWithPassword({
  email: string,
  password: string
})

// Success Response
{
  data: {
    user: User,
    session: Session
  },
  error: null
}

// Error Responses
{
  data: { user: null, session: null },
  error: {
    message: 'Invalid login credentials',  // Wrong email or password
    status: 400
  }
}
```

### Sign Out

```typescript
// Input
supabase.auth.signOut()

// Success Response
{ error: null }

// Error Response (network failure)
{ error: { message: string, status: number } }
```

### Get Session (Persisted)

```typescript
// Input
supabase.auth.getSession()

// Response (session exists)
{
  data: { session: Session },  // Session with valid or refreshed tokens
  error: null
}

// Response (no session)
{
  data: { session: null },
  error: null
}
```

### Auth State Change Listener

```typescript
// Subscribe
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event: AuthChangeEvent, session: Session | null) => {
    // event: 'INITIAL_SESSION' | 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED'
  }
)

// Cleanup
subscription.unsubscribe()
```

## 2. Profile Database API (consumed by `SupabaseProfileRepository`)

### Fetch Profile by User ID

```typescript
// Input
supabase
  .from('profiles')
  .select('id, full_name, role, created_at, updated_at')
  .eq('id', userId)
  .single()

// Success Response
{
  data: {
    id: string,          // UUID
    full_name: string,
    role: 'customer' | 'driver',
    created_at: string,  // ISO 8601
    updated_at: string   // ISO 8601
  },
  error: null
}

// Error Response (not found — edge case: trigger failed)
{
  data: null,
  error: {
    message: 'JSON object requested, multiple (or no) rows returned',
    code: 'PGRST116'
  }
}
```

### RLS Policies (Enforced Server-Side)

| Table | Operation | Policy | Rule |
|---|---|---|---|
| `profiles` | SELECT | Users can view own profile | `auth.uid() = id` |
| `profiles` | UPDATE | Users can update own profile | `auth.uid() = id` |
| `profiles` | INSERT | None (trigger only) | Blocked by RLS |
| `restaurants` | SELECT | Anyone can view | `true` |
| `categories` | SELECT | Anyone can view | `true` |
| `products` | SELECT | Anyone can view | `true` |
| `product_addons` | SELECT | Anyone can view | `true` |
| `favorites` | SELECT/INSERT/DELETE | Own favorites only | `auth.uid() = user_id` |

## 3. Domain Repository Interfaces

### AuthRepository

```typescript
// src/features/auth/domain/repositories/auth-repository.ts

import { AuthUser } from '../entities/auth-user';

export type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; error: AuthErrorType };

export type AuthErrorType =
  | { kind: 'invalid_credentials' }
  | { kind: 'email_already_registered' }
  | { kind: 'weak_password'; message: string }
  | { kind: 'network_error' }
  | { kind: 'unknown'; message: string };

export interface AuthRepository {
  signUp(email: string, password: string, fullName: string): Promise<AuthResult<AuthUser>>;
  signIn(email: string, password: string): Promise<AuthResult<AuthUser>>;
  signOut(): Promise<AuthResult<void>>;
  getSession(): Promise<{ user: AuthUser | null }>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
}
```

### ProfileRepository

```typescript
// src/features/profile/domain/repositories/profile-repository.ts

import { UserProfile } from '../entities/user-profile';

export type ProfileResult<T> =
  | { success: true; data: T }
  | { success: false; error: ProfileErrorType };

export type ProfileErrorType =
  | { kind: 'not_found' }
  | { kind: 'network_error' }
  | { kind: 'unknown'; message: string };

export interface ProfileRepository {
  getProfile(userId: string): Promise<ProfileResult<UserProfile>>;
}
```
