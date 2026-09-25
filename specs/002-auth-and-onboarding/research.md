# Research: Authentication & Onboarding

**Feature**: 002-auth-and-onboarding | **Date**: 2026-09-19

## Research Tasks

### 1. Profile Auto-Creation on Registration

**Context**: FR-006 requires that a profile record is automatically created for newly registered users immediately upon successful registration, before any post-registration screen depends on that profile. The current database schema has no trigger or function for this.

**Decision**: Use a Supabase database trigger (`AFTER INSERT ON auth.users`) that calls a `SECURITY DEFINER` Postgres function to create the profile row automatically.

**Rationale**:
- Server-side trigger guarantees atomicity — the profile exists before any client-side code runs post-registration.
- Client-side profile creation would introduce a failure window where a user exists without a profile, violating FR-006 and creating the edge case described in the spec (profile not found after auth).
- A `SECURITY DEFINER` function bypasses RLS, which is necessary because the `profiles` table needs an INSERT policy that only the trigger should use — not arbitrary authenticated users.
- The trigger reads `full_name` from `raw_user_meta_data` (passed during `supabase.auth.signUp({ data: { full_name } })`), so no second round-trip is needed.

**Alternatives Considered**:
- *Client-side insert after signUp*: Rejected. Creates a race condition and failure window. If the insert fails, the user account exists without a profile.
- *Supabase Edge Function on auth webhook*: Rejected. Adds infrastructure complexity (Edge Function deployment) for something a simple trigger handles.
- *RLS INSERT policy + client insert*: Rejected. Grants authenticated users the ability to create arbitrary profile rows, which is a security risk.

### 2. Missing RLS Policy for Profile INSERT

**Context**: The current schema has RLS enabled on `profiles` but no INSERT policy. Profile creation must happen via the auto-creation trigger, but an INSERT policy is still needed for the trigger function (since it uses `SECURITY DEFINER`, it bypasses RLS, so this is actually not strictly needed — but we should ensure no INSERT policy exists to prevent client-side inserts).

**Decision**: Do NOT add a user-facing INSERT policy on `profiles`. The `SECURITY DEFINER` trigger function bypasses RLS. This means authenticated users cannot insert profile rows directly — only the trigger can. This is the desired behavior.

**Rationale**: Prevents authenticated users from creating fake profiles with arbitrary roles (e.g., a customer creating a driver profile).

**Alternatives Considered**:
- *Add INSERT policy with `auth.uid() = id` check*: Rejected. Would allow a user to insert a profile with `role = 'driver'`, bypassing out-of-band driver provisioning.

### 3. Supabase Auth Session Persistence in React Native

**Context**: FR-010 requires sessions to persist across app restarts. The Supabase client is already configured with `storage: AsyncStorage`, `persistSession: true`, and `autoRefreshToken: true`.

**Decision**: Use the existing Supabase client configuration. Session persistence is already handled by `@supabase/supabase-js` using AsyncStorage.

**Rationale**:
- `supabase.auth.getSession()` retrieves the persisted session on app launch.
- `supabase.auth.onAuthStateChange()` provides a reactive listener for session changes.
- `autoRefreshToken: true` handles token renewal transparently.
- This is the standard Supabase + React Native pattern. No additional configuration needed.

**Alternatives Considered**:
- *expo-secure-store*: Deferred per spec assumption. AsyncStorage is the accepted MVP tradeoff.

### 4. Expo Router Authentication Pattern

**Context**: The app uses Expo Router v57 with file-based routing. Three route groups exist: `(auth)`, `(customer)`, `(driver)`. Need to implement conditional routing based on auth state and role.

**Decision**: Use a React Context-based `AuthProvider` with `<Redirect>` components in layout files.

**Rationale**:
- This is the officially recommended Expo Router auth pattern (per Expo docs).
- The root `_layout.tsx` wraps the app in `AuthProvider` which initializes the Supabase session.
- `app/index.tsx` checks auth state and role, redirects to `/(customer)/(home)` (for guests and customers) or `/(driver)` (for drivers).
- The `(driver)/_layout.tsx` checks for authenticated driver role — redirects to auth if not authenticated or not a driver.
- Guest browsing works because `(customer)` routes are accessible without auth; only specific actions within them are gated.

**Key Pattern**:
```tsx
// AuthProvider exposes: { session, user, profile, isLoading, signIn, signUp, signOut }
// Root index.tsx uses <Redirect> based on session + profile.role
// Protected screens use useRequireAuth() hook that redirects to (auth) if unauthenticated
```

**Alternatives Considered**:
- *useEffect + router.replace*: Works but is imperative and can flash the wrong screen before redirecting.
- *Middleware/interceptor pattern*: Not natively supported by Expo Router.

### 5. Guest Cart Preservation Through Authentication

**Context**: FR-004 requires guest cart contents to survive the auth flow. The cart will be stored in Redux (client-local state per Constitution Principle IV).

**Decision**: Cart state lives in a Redux slice persisted in memory. Since auth happens via a modal-like flow (redirect to `(auth)` group, then back), the Redux store remains in memory throughout — no special serialization is needed.

**Rationale**:
- The app process is not killed during the auth flow (it's an in-app navigation).
- Redux store persists in memory as long as the React tree is mounted.
- The `AppProviders` component (which includes the Redux `Provider`) wraps the entire app, so the store survives route group transitions.
- If a driver logs in, the cart state is simply ignored (driver navigation doesn't render cart UI).

**Alternatives Considered**:
- *Persist cart to AsyncStorage*: Unnecessary for MVP. The cart only needs to survive the auth flow, not app restarts. Adding persistence would add complexity without meeting a current requirement.
- *Transfer cart to server on auth*: Out of scope. Cart is client-local until checkout.

### 6. Role-Based Routing Without Role Selection UI

**Context**: FR-007 and FR-008 require a single login screen for all roles, with automatic routing based on the stored role. No role selection prompt.

**Decision**: After successful authentication, fetch the user's profile from the `profiles` table to determine their role. Route to `/(customer)` for customers and `/(driver)` for drivers.

**Rationale**:
- The `profiles` table has a `role` column (enum: `customer` | `driver`).
- Self-registered users always get `role = 'customer'` (database default).
- Drivers are provisioned out-of-band with `role = 'driver'` already set.
- The auth flow: `signIn()` → `getSession()` → `fetchProfile(userId)` → read `profile.role` → redirect.

**Alternatives Considered**:
- *Store role in JWT custom claims*: Would avoid the profile fetch but requires a Supabase Edge Function or webhook to set claims. Adds deployment complexity for minimal latency gain.
- *Store role in auth.users.raw_user_meta_data*: Supabase allows user-writable metadata, which means a customer could set their own role to driver. Security risk.

### 7. Protected Action Gating Pattern

**Context**: FR-003 requires redirecting unauthenticated visitors to the auth screen for protected actions (checkout, favorites, order history, profile).

**Decision**: Implement a `useRequireAuth()` hook that checks auth state and navigates to `/(auth)/login` if unauthenticated. Use this hook in protected screens/actions.

**Rationale**:
- Simple, composable pattern that can be called from any component or screen.
- For screen-level protection (favorites, profile, orders): call `useRequireAuth()` at the top of the screen component — it redirects before rendering.
- For action-level protection (checkout button in cart): call a `requireAuth()` function before the action — it redirects if needed.
- After auth completes, the user lands on the role-appropriate home screen (per spec clarification), not the original screen.

**Alternatives Considered**:
- *Layout-level redirect in (customer)/_layout.tsx*: Would gate ALL customer routes, breaking guest browsing.
- *HOC wrapper*: More verbose than a hook with no additional benefit.

### 8. Error Handling Strategy

**Context**: FR-012 requires clear error feedback for invalid credentials, duplicate email, weak password, and network failure.

**Decision**: Map Supabase Auth error codes to user-friendly messages in the infrastructure layer. The auth repository returns typed error results, and the presentation layer renders them as inline form errors.

**Rationale**:
- Supabase Auth returns specific error messages/codes for each case:
  - Invalid credentials: `Invalid login credentials`
  - Duplicate email: `User already registered`
  - Weak password: `Password should be at least 6 characters`
  - Network failure: caught via `try/catch` on the fetch layer
- The infrastructure layer maps these to domain-level error types.
- The presentation layer renders errors without revealing which field was wrong (for login, per security spec).

**Alternatives Considered**:
- *Toast notifications*: Less discoverable than inline errors. Rejected for form validation.
- *Error boundary*: Too coarse-grained for field-level auth errors.

### 9. Profile-Not-Found Error State

**Context**: FR-013 and the edge case spec require a clear error state when a successfully authenticated user's profile cannot be found, with retry and sign-out options.

**Decision**: In the `AuthProvider`, after successful authentication, attempt to fetch the profile. If the profile fetch fails (not found or network error), set an `authError` state with type `'profile_not_found'`. The root layout renders a dedicated error screen for this state with "Retry" and "Sign Out" buttons.

**Rationale**:
- This is a rare but critical edge case (profile auto-creation trigger failure, or database inconsistency).
- A dedicated error component prevents the app from hanging on a loading screen or silently misrouting.
- Retry re-fetches the profile. Sign-out clears the session and returns to guest browsing.

**Alternatives Considered**:
- *Ignore and let screens handle it*: Each screen would need to handle missing profile independently. Inconsistent and error-prone.
- *Auto-create profile client-side as fallback*: Would mask the real issue and violates the server-authority principle.
