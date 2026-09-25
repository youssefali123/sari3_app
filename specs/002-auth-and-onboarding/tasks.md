# Tasks: Authentication & Onboarding

**Feature**: 002-auth-and-onboarding | **Generated**: 2026-09-19
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

> **No tests requested** — manual acceptance validation via [quickstart.md](./quickstart.md).

---

## Phase 1: Setup

**Purpose**: Generate database types, provision driver test account, and confirm environment prerequisites before any story implementation.

- [X] T00Generate Supabase TypeScript types from live schema via `npx supabase gen types typescript --local > src/shared/types/supabase.ts` (file does NOT yet exist — this is new work)
- [X] T00[P] Verify `.env` file contains valid `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; document `.env.example` if not already present
- [X] T00[P] Provision one test driver account in Supabase dashboard: create Auth user → insert `profiles` row with `role = 'driver'` and a `full_name`; record credentials in a local `.env.test` or team note for manual validation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth/profile domain interfaces, Supabase infrastructure, context provider, and database migrations that ALL user-story phases depend on.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

### Database Migrations

- [X] T004 Create migration `supabase/migrations/20260919000001_auth_profile_trigger.sql` — full `handle_new_user()` `SECURITY DEFINER` trigger on `auth.users` insert; inserts `profiles (id, full_name, role)` with `role` hardcoded to `'customer'`; reads `full_name` from `NEW.raw_user_meta_data->>'full_name'`; includes `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users` for idempotency
- [X] T005 Create migration `supabase/migrations/20260919000002_place_order_customer_role_check.sql` — complete, executable `CREATE OR REPLACE FUNCTION public.place_order(p_payload JSONB)` as defined verbatim in `plan.md § Database Schema & Migration Requirements § 2`; adds customer-role check as step 2 (after `auth.uid()` check, before store validation); preserves all 21 existing Catalog checkout guarantees including: auth check, store existence/open, address ownership, canonical product prices, add-on availability/prices, quantity validation, coupon `FOR UPDATE` row-lock, coupon validity/eligibility/discount calculation, immutable order/item/coupon-redemption inserts, authoritative totals, camelCase JSONB return; no client-supplied prices are trusted; entire transaction rolls back on any exception

### Auth Domain

- [X] T006 Rename and update `src/features/auth/domain/entities/User.ts` → `src/features/auth/domain/entities/AuthUser.ts` — slim `AuthUser` interface: `id: string`, `email: string`; **remove** the `role` field (role lives in `UserProfile`, not `AuthUser`); retain `UserRole` type export `'customer' | 'driver'` for reuse elsewhere; drop unused fields (`phone`, `avatarUrl`, `createdAt`) from this identity-only entity
- [X] T007 Update `src/features/auth/domain/repositories/AuthRepository.ts` — update `RegisterInput` to `{ email: string; password: string; fullName: string }` (remove `role` field); add `AuthConfirmationPending` type `{ confirmationRequired: true }` to cover email-confirmation state; update `register` return type to `Promise<AuthResult<AuthUser | AuthConfirmationPending>>`; ensure `onAuthStateChange` callback signature is `(user: AuthUser | null) => void`

### Profile Domain

- [X] T008 Create `src/features/profile/domain/entities/UserProfile.ts` — interface `UserProfile { id: string; fullName: string; role: 'customer' | 'driver'; phone: string | null; avatarUrl: string | null; createdAt: string; updatedAt: string }`; add JSDoc explaining this is the authoritative application role source, never `AuthUser`
- [X] T009 Update `src/features/profile/domain/repositories/ProfileRepository.ts` — change return types to use `UserProfile` (from `./entities/UserProfile`) instead of `User`; keep `getProfile(userId: string): Promise<UserProfile>` and `updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile>`; add `ProfileNotFoundError` typed error

### Supabase Infrastructure

- [X] T010 Create `src/features/auth/infrastructure/SupabaseAuthRepository.ts` — implements `AuthRepository`; `signUp`: calls `supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })`; if `session === null && !error` returns `{ success: true, data: { confirmationRequired: true } }`; if `session` present returns `{ success: true, data: AuthUser }`; maps Supabase error messages to `AuthErrorType` (`'User already registered'` → `email_already_registered`, `'Password should be at least 6 characters'` → `weak_password`, network catch → `network_error`); `signIn`: calls `supabase.auth.signInWithPassword`; maps `'Invalid login credentials'` → `invalid_credentials`; `signOut`: calls `supabase.auth.signOut()`; `getSession`: calls `supabase.auth.getSession()` and maps to `AuthUser | null`; `onAuthStateChange`: subscribes via `supabase.auth.onAuthStateChange`, returns `subscription.unsubscribe`
- [X] T011 Create `src/features/profile/infrastructure/SupabaseProfileRepository.ts` — implements `ProfileRepository`; `getProfile(userId)`: queries `supabase.from('profiles').select('id, full_name, role, phone, avatar_url, created_at, updated_at').eq('id', userId).single()`; maps snake_case columns to `UserProfile` camelCase fields; throws `ProfileNotFoundError` when Supabase returns `PGRST116`; `updateProfile(userId, input)`: upserts and returns updated `UserProfile`

### AuthContext & Provider

- [X] T012 Create `src/features/auth/application/context/AuthContext.tsx` — React context holding: `{ user: AuthUser | null; profile: UserProfile | null; isLoading: boolean; authError: AuthErrorKind | null; signIn(email, password): Promise<AuthResult<AuthUser>>; signUp(email, password, fullName): Promise<AuthResult<AuthUser | AuthConfirmationPending>>; signOut(): Promise<void> }`; implement `AuthProvider` component: on mount call `supabase.auth.getSession()` to resolve initial session; subscribe to `supabase.auth.onAuthStateChange` for `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `USER_UPDATED`; on session present fetch profile via `SupabaseProfileRepository`; if profile fetch fails set `authError = 'profile_not_found'`; keep `isLoading: true` until `INITIAL_SESSION` event resolves; on `signOut` call `SupabaseAuthRepository.signOut()`, then `queryClient.clear()`, then reset state; cleanup `subscription.unsubscribe()` on unmount; do NOT couple to Expo Router — no `router` calls inside this file
- [X] T013 Update `src/providers/AppProviders.tsx` — wrap children in `<AuthProvider>` inside the existing `QueryClientProvider` + Redux `Provider`; pass `queryClient` instance into `AuthProvider` so it can call `queryClient.clear()` on sign-out; final nesting order: `SafeAreaProvider > Provider(redux) > QueryClientProvider > AuthProvider > children`

### Core Hooks

- [X] T014 Create `src/features/auth/application/hooks/useAuth.ts` — thin hook that reads from `AuthContext`; exports `{ user, profile, isLoading, authError, signIn, signUp, signOut }`; throws if used outside `AuthProvider`
- [X] T015 Create `src/features/auth/presentation/hooks/useRequireAuth.ts` — presentation hook accepting optional `returnTo?: string`; reads `useAuth()`; if `!isLoading && !user` calls `router.push({ pathname: '/(auth)/login', params: { returnTo: returnTo ?? '' } })`; returns `{ isAuthenticated: boolean; isLoading: boolean }`; placed in Presentation layer per Constitution Principle II because it orchestrates UI navigation via `expo-router`

### Shared Reconciliation

- [X] T016 Update `src/shared/lib/auth.ts` — replace `useCurrentCustomerId` TanStack Query implementation with a simple delegation: `import { useAuth } from '@/features/auth/application/hooks/useAuth'; export function useCurrentCustomerId() { const { user } = useAuth(); return user?.id ?? null; }` — preserves call-sites in `addresses/index.tsx`, `checkout/index.tsx`, `favorites/stores.tsx`, `favorites/products.tsx`, `orders/index.tsx`, `orders/[id].tsx` without modification

**Checkpoint**: Foundation complete — AuthContext resolves sessions, SupabaseAuthRepository handles all auth ops, profile loading works, `useRequireAuth` available. All user stories can now be implemented.

---

## Phase 3: User Story 1 — Guest Browsing (Priority: P1) 🎯 MVP

**Goal**: Unauthenticated visitors can open the app, browse the full catalog, open store details, interact with `AddOnSelectorModal`, and build a cart — without any sign-in prompt. Session resolution shows splash screen and never redirects guests to login.

**Independent Test** (Quickstart Scenario 1): Launch the app fresh (no stored session) → home screen displays stores without auth prompt → tap a store → browse categories/products → add a product with an add-on → cart badge increments.

### Implementation

- [X] T017 [US1] Update `src/app/_layout.tsx` — integrate `expo-splash-screen`; call `SplashScreen.preventAutoHideAsync()` before render; in `RootLayout` use `useAuth()` to read `isLoading`; call `SplashScreen.hideAsync()` when `isLoading` is `false`; render a blank/loading view while `isLoading` is `true` to prevent premature layout flashes; keep existing `<Stack>` structure with `(auth)`, `(customer)`, `(driver)` screens unchanged
- [X] T018 [US1] Update `src/app/index.tsx` — read `{ user, profile, isLoading }` from `useAuth()`; while `isLoading` render `null` (splash is still showing); if no session (`!user`) redirect to `/(customer)/(home)` — guests go to the customer home, not to login; if `profile.role === 'customer'` redirect to `/(customer)/(home)`; if `profile.role === 'driver'` redirect to `/(driver)/available-orders`; if `authError === 'profile_not_found'` render `ProfileErrorView` (imported from auth presentation layer)

**Checkpoint**: Guest opens app → sees home screen → browses catalog → cart works → no auth prompt anywhere.

---

## Phase 4: User Story 2 — Customer Sign-Up & Automatic Profile Creation (Priority: P1) 🎯 MVP

**Goal**: A guest who attempts a protected action is redirected to auth with a `returnTo` param, can register with `email + password + fullName` (no role selector), and upon success lands at their intended destination with cart intact and a `profiles` row auto-created by trigger.

**Independent Test** (Quickstart Scenario 2): Add items to cart → tap "Proceed to Checkout" → redirect to login screen → switch to register → submit valid form → land at `/checkout` with cart intact → confirm `profiles` row exists in Supabase with `role = 'customer'`.

### Implementation

- [X] T019 [US2] Create `src/features/auth/presentation/components/RegisterForm.tsx` — React Native form with exactly 3 fields: `Email` (TextInput, `keyboardType="email-address"`, `autoCapitalize="none"`), `Password` (TextInput, `secureTextEntry`), `Full Name` (TextInput); validates: `fullName.trim().length > 0` else show inline error "Full name is required"; calls `signUp(email, password, fullName)` from `useAuth()`; on `AuthConfirmationPending` result renders confirmation message "Account created! Please check your email to confirm your account before signing in." with a "Back to Login" button that passes `returnTo` to `/(auth)/login`; on `AuthUser` success calls post-auth navigation logic (see T021); on error renders inline error via `authErrorToMessage(error)` helper; no role selector anywhere in this component
- [X] T020 [US2] Create `src/features/auth/presentation/components/LoginForm.tsx` — React Native form with `Email` and `Password` fields; calls `signIn(email, password)` from `useAuth()`; on success calls post-auth navigation logic (see T021); on error renders inline error via `authErrorToMessage(error)` helper; renders "Don't have an account? Register" link that navigates to `/(auth)/register?returnTo=${returnTo}` preserving the param
- [X] T021 [US2] Create `src/features/auth/presentation/components/ProfileErrorView.tsx` — renders when `authError === 'profile_not_found'`; displays title "Account Setup Incomplete", description "Your profile could not be loaded. This may be a temporary issue.", a "Retry" button that re-fetches the profile by triggering `AuthContext` reload, and a "Sign Out" button that calls `signOut()`
- [X] T022 [US2] Update `src/app/(auth)/login.tsx` — replace placeholder with `LoginForm`; read `returnTo` from `useLocalSearchParams<{ returnTo?: string }>()`; pass `returnTo` to `LoginForm`; after successful customer authentication: if `returnTo` is non-empty and starts with `/(customer)/` call `router.replace(returnTo as any)`; else call `router.replace('/(customer)/(home)')`; after successful driver authentication always call `router.replace('/(driver)/available-orders')` regardless of `returnTo`
- [X] T023 [US2] Update `src/app/(auth)/register.tsx` — replace placeholder with `RegisterForm`; read `returnTo` from `useLocalSearchParams<{ returnTo?: string }>()`; pass `returnTo` to `RegisterForm`; apply same post-auth routing logic as T022
- [X] T024 [US2] Update `src/app/(customer)/cart.tsx` — import `useAuth` and `useRouter`; in the "Proceed to Checkout" button `onPress`, check `if (!user)` then `router.push({ pathname: '/(auth)/login', params: { returnTo: '/(customer)/checkout' } })` instead of `router.push('/(customer)/checkout')`; do NOT clear or modify cart during this check

**Checkpoint**: Guest adds items → taps Checkout → redirected to login with `returnTo` → registers → lands at `/checkout` with cart preserved → `profiles` row exists in DB with `role='customer'`.

---

## Phase 5: User Story 3 — Existing User Login & Role-Based Routing (Priority: P1)

**Goal**: A returning user (customer or driver) enters credentials on the shared login screen, app reads `profiles.role` from server, and routes to the correct tab navigator — no role selection UI anywhere.

**Independent Test** (Quickstart Scenarios 3 & 4): Log in with customer account → land in customer navigation; log in with driver account → land in driver navigation. Roles read from `public.profiles`. No role toggle visible.

### Implementation

- [X] T025 [US3] Update `src/app/(customer)/profile.tsx` — call `useRequireAuth()` at top of component; if not authenticated redirect (handled by hook); import `useAuth`; use `signOut()` from context instead of direct `supabase.auth.signOut()` call (ensures `queryClient.clear()` runs on logout); show user `profile.fullName` and `profile.role` in the UI (read from `useAuth().profile`)
- [X] T026 [P] [US3] Create `src/features/profile/application/hooks/useProfile.ts` — TanStack Query hook: `useQuery({ queryKey: ['profile', userId], queryFn: () => profileRepository.getProfile(userId), enabled: !!userId, staleTime: 5 * 60 * 1000 })`; returns `{ profile, isLoading, isError, refetch }`; used by screens that need profile data outside `AuthContext`

**Checkpoint**: Customer login → customer tabs visible; driver login → driver tabs visible; role sourced from `public.profiles`.

---

## Phase 6: User Story 4 — Protected Action Gating with Return-to-Context (Priority: P2)

**Goal**: Unauthenticated guests hitting any protected screen or action are captured with a `returnTo` param and redirected to auth. After successful authentication, customers return to their specific intended destination with the guest cart intact; drivers always route to the driver home.

**Independent Test** (Quickstart Scenario 5): As guest — tap Checkout (returnTo checkout), tap Favorites (returnTo favorites), tap Orders (returnTo orders), tap Profile (returnTo profile), tap Addresses (returnTo addresses). Authenticate → each returns to the correct screen. Cart intact throughout.

### Implementation

- [X] T027 [US4] Update `src/app/(customer)/checkout/index.tsx` — add `useRequireAuth('/(customer)/checkout')` call at top; if not authenticated, hook redirects to `/(auth)/login?returnTo=/(customer)/checkout`; no other logic changes to checkout behavior
- [X] T028 [US4] Update `src/app/(customer)/addresses/index.tsx` — add `useRequireAuth('/(customer)/addresses')` call at top; hook handles redirect with `returnTo` param; existing address CRUD logic unchanged
- [X] T029 [US4] Update `src/app/(customer)/favorites/stores.tsx` — add `useRequireAuth('/(customer)/favorites/stores')` call at top; existing favorites query logic unchanged (already guarded by `enabled: Boolean(customerId)`)
- [X] T030 [P] [US4] Update `src/app/(customer)/favorites/products.tsx` — add `useRequireAuth('/(customer)/favorites/products')` call at top; same pattern as T029
- [X] T031 [US4] Update `src/app/(customer)/orders/index.tsx` — add `useRequireAuth('/(customer)/orders')` call at top; existing orders query unchanged
- [X] T032 [P] [US4] Update `src/app/(customer)/orders/[id].tsx` — add `useRequireAuth('/(customer)/orders')` call at top (returnTo the list, not the specific ID)
- [X] T033 [US4] Update `src/features/favorites/presentation/FavoriteButton.tsx` — in the `onPress` handler, before calling `mutation.mutate`, check `if (!customerId)` (guest) and call `router.push({ pathname: '/(auth)/login', params: { returnTo: '/(customer)/favorites/stores' } })`; import `useRouter` from `expo-router`; do not throw or silently fail — redirect instead

**Checkpoint**: All 5 protected action types redirect to auth with `returnTo`. Post-auth, each returns to the correct destination. Cart preserved throughout.

---

## Phase 7: User Story 5 — Session Persistence & Logout (Priority: P2)

**Goal**: Authenticated users reopen the app and remain logged in (AsyncStorage session restored via Supabase). Logout calls centralized `signOut()` which purges TanStack Query cache and returns to guest browsing.

**Independent Test** (Quickstart Scenario 6): Log in → force-close app → reopen → still authenticated, correct role navigation visible → tap Log Out → guest browsing state, can build a new cart.

### Implementation

- [X] T034 [US5] Update `src/app/(driver)/_layout.tsx` — read `{ user, profile, isLoading }` from `useAuth()`; while `isLoading` render `null`; if `!user` redirect to `/(auth)/login` (no `returnTo` for driver routes); if `user && profile?.role !== 'driver'` redirect to `/(customer)/(home)`; role check uses server-authoritative `profile.role` from `AuthContext`; no business logic in layout beyond this guard
- [X] T035 [US5] Verify TanStack Query cache purge on sign-out — confirm that calling `signOut()` from `useAuth()` triggers `queryClient.clear()` and removes all customer-scoped cached queries
- [X] T036 [US5] Verify `src/app/(customer)/profile.tsx` (from T025) uses `signOut()` from `useAuth()` and NOT the raw `supabase.auth.signOut()` call present in the original placeholder; this ensures cache clearing on logout

**Checkpoint**: App restarts → session restored → correct role nav shown → logout clears all query cache → guest browsing restored.

---

## Phase 8: User Story 6 — Authentication Error Handling (Priority: P3)

**Goal**: Every predictable auth failure (invalid credentials, duplicate email, weak password, empty name, network failure) produces a clear, specific inline error message. No ambiguous or silent failures.

**Independent Test** (Quickstart Scenario 7): Deliberately trigger each error case and verify inline error message appears within 5 seconds.

### Implementation

- [X] T037 [US6] Create `src/features/auth/presentation/components/authErrorToMessage.ts` (utility, not a component) — maps `AuthErrorType` to user-facing strings: `invalid_credentials` → "Incorrect email or password."; `email_already_registered` → "This email is already registered. Try logging in instead."; `weak_password` → "Password must be at least 6 characters."; `network_error` → "No internet connection. Please check your network and try again."; `unknown` → "Something went wrong. Please try again."; also handle client-side validation: empty `fullName` → "Full name is required." (enforced in `RegisterForm` before calling `signUp`)
- [X] T038 [P] [US6] Update `src/features/auth/presentation/components/LoginForm.tsx` (from T020) — ensure all `AuthErrorType` variants are mapped through `authErrorToMessage`; error displayed inline below the form (not as alert); error clears when user starts typing
- [X] T039 [P] [US6] Update `src/features/auth/presentation/components/RegisterForm.tsx` (from T019) — ensure all `AuthErrorType` variants are mapped through `authErrorToMessage`; inline `fullName` empty-string validation fires before calling `signUp`; password length < 6 validated client-side for instant feedback (Supabase also enforces server-side); error clears on input change
- [X] T040 [US6] Verify `src/app/(customer)/profile.tsx` sign-out error is surfaced — if `signOut()` rejects (network failure) display an `Alert` with the error message (existing placeholder already uses `Alert.alert`; confirm it delegates through the new `signOut()` from `useAuth()`)

**Checkpoint**: Each of the 5 error cases in Quickstart Scenario 7 produces the correct message within 5 seconds.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final wiring, validation of all 25 acceptance scenarios, and cleanup.

- [X] T041 Verify `supabase/migrations/20260919000001_auth_profile_trigger.sql` and `20260919000002_place_order_customer_role_check.sql` both apply cleanly with `npx supabase db push` (or against local Supabase); confirm trigger fires on test registration by checking `profiles` row appears
- [ ] T042 Run through all 9 Quickstart Validation Scenarios in `quickstart.md` and confirm all 25 acceptance scenarios pass; document any deviations
- [X] T043 [P] Run `expo lint` and `tsc --noEmit`; resolve all TypeScript strict-mode errors introduced by this feature (especially `AuthUser`, `UserProfile`, `RegisterInput` type updates)
- [X] T044 [P] Confirm `src/shared/types/supabase.ts` (T001) is imported in `SupabaseAuthRepository.ts` and `SupabaseProfileRepository.ts` for type-safe Supabase query results; update column references to match generated type field names if needed
- [X] T045 [P] Confirm that `useCurrentCustomerId` (in `src/shared/lib/auth.ts`, updated in T016) still works correctly in all consumer files: `addresses/index.tsx`, `checkout/index.tsx`, `favorites/stores.tsx`, `favorites/products.tsx`, `orders/index.tsx`, `orders/[id].tsx`; no call-site changes needed if delegation is correct
- [X] T046 Confirm driver cannot call `place_order` server-side: using the Supabase SQL editor, run `place_order` as a driver user and verify exception `'ONLY_CUSTOMERS_CAN_PLACE_ORDERS'` is raised with no order row inserted

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1; **blocks all user-story phases**
- **Phase 3 (US1 — Guest Browsing)**: Depends on Phase 2 only
- **Phase 4 (US2 — Customer Sign-Up)**: Depends on Phase 2; Phase 3 recommended first
- **Phase 5 (US3 — Login & Role Routing)**: Depends on Phase 4 (LoginForm from T020)
- **Phase 6 (US4 — Protected Action Gating)**: Depends on Phase 2; `useRequireAuth` (T015) must exist
- **Phase 7 (US5 — Session Persistence & Logout)**: Depends on Phase 2; Phase 3 recommended first
- **Phase 8 (US6 — Error Handling)**: Depends on Phase 4 (LoginForm, RegisterForm)
- **Phase 9 (Polish)**: Depends on all story phases

### User Story Dependencies

| Story | Depends On | Notes |
|---|---|---|
| US1 — Guest Browsing | Phase 2 only | Independent |
| US2 — Customer Sign-Up | Phase 2 | LoginForm/RegisterForm created here |
| US3 — Login & Role Routing | US2 (shares LoginForm) | Thin phase |
| US4 — Protected Gating | Phase 2 (`useRequireAuth`) | Independent of US2/US3 |
| US5 — Session & Logout | Phase 2 | Independent; driver layout guard here |
| US6 — Error Handling | US2 (LoginForm, RegisterForm) | Error mapping layer |

### Parallel Opportunities Per Phase

**Phase 1** — T001, T002, T003 all [P] (separate concerns)

**Phase 2** — parallel tracks:
- DB migrations: T004, T005 [P]
- Domain: T006, T007, T008, T009 [P]
- Infrastructure: T010, T011 [P] (after domain)
- Context: T012 (after T010, T011) → T013
- Hooks: T014, T015, T016 [P] (after T012)

**Phase 6** — T028, T029, T030, T031, T032, T033 all [P] (different files)

**Phase 8** — T038, T039 [P] (different form components)

**Phase 9** — T043, T044, T045 [P]

---

## Parallel Execution Examples

### Phase 2 — Foundational (two tracks in parallel)

```
Track A (DB + Infra):
  T004 → T005 (migrations, sequential for dependency order)
  T010 → T011 (Supabase repos, after domain interfaces T006-T009)

Track B (Domain + Context):
  T006 + T007 + T008 + T009 (parallel, domain entities/interfaces)
  → T012 (AuthContext, after T010 + T011)
  → T013 (AppProviders, after T012)
  T014 + T015 + T016 (parallel, hooks, after T012)
```

### Phase 6 — Protected Gating (all in parallel after T015 exists)

```
T027 [checkout]  T028 [addresses]  T029 [fav stores]
T030 [fav prods] T031 [orders]     T032 [order detail]
T033 [FavoriteButton]
```

---

## Implementation Strategy

### MVP Scope (User Stories 1 + 2 only — fully working guest-to-customer flow)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T016) — **CRITICAL**
3. Complete Phase 3: US1 — Guest Browsing (T017–T018)
4. Complete Phase 4: US2 — Customer Sign-Up (T019–T024)
5. **STOP AND VALIDATE** via Quickstart Scenarios 1 & 2
6. Guest can browse → add items → checkout gate → register → land at checkout with cart intact

### Incremental Delivery

1. **MVP**: Phases 1–4 → Guest browsing + customer registration working
2. **+Login & Routing**: Phase 5 → Returning users log in, role-based routing complete
3. **+Gating**: Phase 6 → All protected actions have return-to-context
4. **+Session**: Phase 7 → App restarts keep session; logout clears cache; driver guard complete
5. **+Errors**: Phase 8 → All 5 error cases handled with clear messages
6. **Polish**: Phase 9 → Full validation of 25 acceptance scenarios

---

## Notes

- `[P]` = task targets a different file from other concurrent `[P]` tasks — safe to parallelize
- `[USn]` = maps task to a specific user story for traceability
- **No test tasks generated** — no test framework is configured; validation is manual per `quickstart.md`
- Guest cart (Redux in-memory) is never cleared during authentication — preserved across all route transitions
- `AsyncStorage` is used **only** as the Supabase Auth session storage adapter — not as a role/profile cache
- Driver accounts must be provisioned via Supabase dashboard (T003); no in-app driver registration path exists
- `place_order` migration (T005) replaces the existing function in-place via `CREATE OR REPLACE` — no second competing function is created
