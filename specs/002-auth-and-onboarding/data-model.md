# Data Model: Authentication & Onboarding

**Feature**: 002-auth-and-onboarding | **Date**: 2026-09-19

## Entities

### 1. AuthUser (Domain Entity)

**Location**: `src/features/auth/domain/entities/auth-user.ts`

Represents the authenticated identity from Supabase Auth. This is the client-side domain representation, NOT the database row.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (UUID from `auth.users.id`) |
| `email` | `string` | User's email address |

**Notes**:
- Created from `supabase.auth.getSession()` or `supabase.auth.onAuthStateChange()`.
- Does NOT contain role — role lives in the `UserProfile` entity (separate concern).
- Nullable in the auth context: `null` means unauthenticated (guest).

### 2. UserProfile (Domain Entity)

**Location**: `src/features/profile/domain/entities/user-profile.ts`

Represents the user's app-specific profile data. Maps to the `profiles` database table.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID, same as `auth.users.id` (PK + FK) |
| `fullName` | `string` | User's full name (required, non-empty) |
| `role` | `'customer' \| 'driver'` | User role enum |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp |

**Relationships**:
- 1:1 with `auth.users` (same `id`, cascade delete)

**Validation Rules**:
- `fullName` must be non-empty and not whitespace-only (FR-015)
- `role` defaults to `'customer'` on insert (database default)
- `role` is set to `'driver'` only via out-of-band provisioning

**State Transitions**: None. Profile is created once and updated (name only). Role is immutable from the user's perspective.

### 3. GuestCart (Domain Concept — Redux Slice)

**Location**: `src/features/cart/cart-slice.ts`

A temporary, session-scoped collection of selected products and add-ons. Stored in Redux (client-local state).

| Field | Type | Description |
|---|---|---|
| `items` | `CartItem[]` | Array of items in the cart |

**CartItem**:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique cart item identifier (client-generated) |
| `productId` | `string` | UUID of the product |
| `productName` | `string` | Display name (snapshot) |
| `price` | `number` | Unit price at time of adding (snapshot) |
| `quantity` | `number` | Quantity selected |
| `addons` | `CartAddon[]` | Selected add-ons |
| `restaurantId` | `string` | UUID of the restaurant (for grouping) |

**CartAddon**:

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID of the product addon |
| `name` | `string` | Addon display name (snapshot) |
| `price` | `number` | Addon price (snapshot) |

**Notes**:
- Exists before authentication — survives the auth flow via Redux store in memory.
- Preserved when a guest signs up or logs in as a customer (FR-004).
- Discarded/ignored when a driver logs in (driver navigation has no cart UI).
- NOT persisted to AsyncStorage or server for MVP.

### 4. AuthSession (Domain Concept — Context State)

**Location**: `src/features/auth/application/context/auth-context.ts`

Represents the current authentication state. Managed by React Context, not stored in a database table.

| Field | Type | Description |
|---|---|---|
| `session` | `Session \| null` | Supabase session object (contains access token, refresh token) |
| `user` | `AuthUser \| null` | Parsed auth user, or null if unauthenticated |
| `profile` | `UserProfile \| null` | Fetched profile, or null if guest/loading |
| `isLoading` | `boolean` | True during session initialization |
| `authError` | `AuthError \| null` | Error state (e.g., profile not found) |

**State Transitions**:

```
[Loading] ──session found──▶ [Authenticated + Profile Fetched] ──role=customer──▶ [Customer]
    │                              │                                                   
    │                              ├──role=driver──▶ [Driver]
    │                              │
    │                              └──profile not found──▶ [Error State]
    │
    └──no session──▶ [Guest]
    
[Guest] ──signUp/signIn──▶ [Loading] ──▶ [Authenticated + Profile Fetched]

[Authenticated] ──signOut──▶ [Guest]
```

## Database Schema Changes Required

### New: Profile Auto-Creation Trigger

```sql
-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Purpose**: Guarantees FR-006 — profile row exists before any post-registration screen loads.

**Notes**:
- `SECURITY DEFINER` bypasses RLS so the function can insert into `profiles` without a user-facing INSERT policy.
- `full_name` is read from `raw_user_meta_data`, which is set during `signUp({ options: { data: { full_name } } })`.
- Role is hardcoded to `'customer'` — drivers are provisioned out-of-band.

### Existing Schema (No Changes Needed)

- `profiles` table: Already has correct structure (id, full_name, role, created_at, updated_at)
- `user_role` enum: Already has `'customer' | 'driver'`
- RLS on `profiles`: SELECT and UPDATE policies already correct. No INSERT policy is intentional.
- RLS on restaurants, categories, products, product_addons: Already allow public read (supports guest browsing)
