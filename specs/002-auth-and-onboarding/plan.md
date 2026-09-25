# Implementation Plan: Authentication & Onboarding

**Branch**: `002-auth-and-onboarding` | **Date**: 2026-09-19 | **Spec**: [spec.md](file:///home/youssef/Desktop/sari3-app/sari3_speckit/sari3_app2/specs/002-auth-and-onboarding/spec.md)

**Input**: Feature specification from `specs/002-auth-and-onboarding/spec.md`, ratified project constitution (`.specify/memory/constitution.md`), and the actual codebase structure after feature `001-catalog-checkout-foundation`.

---

## Summary

Implement authentication, onboarding, and guest access for the Sari3 delivery application with role-based routing for customers and drivers. 

This implementation integrates directly with the **existing post-001 codebase**:
- Preserves the existing **4-tab customer layout** (`Home`, `Cart`, `Orders`, `Profile`) and existing routes (`store/[id].tsx`, `addresses/index.tsx`, `checkout/index.tsx`, `favorites/*`).
- Reuses the existing **Redux cart implementation** (`src/shared/lib/store.ts` and `src/features/cart/application/cartSlice.ts`) without duplication or simplification, keeping guest cart items intact throughout authentication.
- Implements **Option B** for Supabase Auth session persistence using `@react-native-async-storage/async-storage`.
- Features an explicit **protected-action return-to-context mechanism**: when an unauthenticated visitor attempts a protected action (checkout, favoriting, orders, profile, addresses), the target destination is preserved via lightweight navigation route params (`returnTo`). Upon authentication, customers return seamlessly to their attempted action/destination with the guest cart intact, while drivers follow driver routing rules.
- Enforces **server-authoritative roles**: public self-service registration always creates a Customer profile via a database trigger; Driver accounts are provisioned out-of-band; drivers are prohibited server-side from placing customer orders via a complete, executable `place_order` migration preserving all 21 catalog checkout guarantees.
- Synchronizes authentication state via Supabase `onAuthStateChange`, guards driver routes in `src/app/(driver)/_layout.tsx`, and purges all customer-scoped TanStack Query cache on sign-out to prevent cross-account data leaks.
- Handles explicit email confirmation states, unauthenticated guest browsing, and protected action gating across all customer touchpoints.

---

## Technical Context

**Language/Version**: TypeScript (strict mode `strict: true`) on React Native 0.86.3, Expo SDK 57 (~57.0.20), React 19.2.3

**Primary Dependencies**:
- `@supabase/supabase-js` ^2.116.0 — Supabase Auth, PostgreSQL client, Realtime subscriptions
- `expo-router` ~57.0.19 — File-based navigation with route groups `(auth)`, `(customer)`, `(driver)`
- `@tanstack/react-query` ^5.102.8 — Server state management (profiles, addresses, favorites, orders)
- `@reduxjs/toolkit` ^2.12.0 + `react-redux` ^9.3.0 — Client-local state (existing Cart store and slice)
- `@react-native-async-storage/async-storage` 2.2.0 — Storage adapter for Supabase Auth session persistence (Option B)
- `expo-splash-screen` ~57.0.8 — Native splash screen coordination during session resolution

**Storage Architecture**:
- **Supabase Postgres**: Authoritative storage for user accounts, `profiles`, `restaurants`, `products`, `saved_addresses`, `favorites`, `orders`, and database triggers/RPCs.
- **AsyncStorage**: Exclusively used as the client storage adapter for Supabase Auth session tokens (`sb-<project-ref>-auth-token`). It is **not** a second source of truth for user roles or profile records.
- **Redux Store**: In-memory client-local store for cart state (`items`, `storeId`, `storeName`, `conflictState`).

**Testing Status**:
- Manual acceptance testing per the 25 defined acceptance scenarios.
- TypeScript compiler (`tsc --noEmit`) and Expo ESLint (`expo lint`) verify type safety and code quality.
- Automated testing frameworks (Jest / React Native Testing Library) are currently not configured in `package.json` and are not introduced in this feature.

**Target Platforms**: Android & iOS (Expo managed workflow)

**Performance Goals**:
- Session resolution and initial role routing within 3 seconds of app launch (SC-003).
- Auth error feedback displayed within 5 seconds of form submission (SC-005).
- Profile missing error state displayed within 5 seconds with actionable recovery (SC-006).

**Accepted MVP Tradeoff**:
> *AsyncStorage is intentionally used for auth session persistence for the MVP. This is an accepted tradeoff for this project and is not to be changed in this feature.*

---

## Constitution Check

*GATE: Evaluated against `.specify/memory/constitution.md` (v1.1.0).*

| Principle | Status | Notes & Verification |
|---|---|---|
| **I. Feature-First Structure** | ✅ PASS | Auth logic is isolated in `src/features/auth/`, profile logic in `src/features/profile/`. Navigation routes reside in `src/app/`. Existing `src/features/cart/` and `src/features/addresses/` remain untouched. |
| **II. Lightweight Clean Architecture** | ✅ PASS | Meaningful auth and profile capabilities follow `Presentation → Application → Domain ← Infrastructure`. Domain entities and repository interfaces are pure TypeScript. Infrastructure contains Supabase implementations. Navigation targets (`returnTo`) reside in Presentation/Router, keeping Domain and Application decoupled from Expo Router. |
| **III. Dependency Direction Fixed** | ✅ PASS | Presentation components import from Application and Domain; Application coordinates with Domain interfaces; Infrastructure implements Domain interfaces (`AuthRepository`, `ProfileRepository`). Domain never imports Infrastructure or external frameworks. |
| **IV. State Ownership Not Duplicated** | ✅ PASS | Clear boundaries: AuthContext owns auth session identity (per **Exception IV-A — Auth Session State**, constitution v1.1.0: the raw Supabase `Session` object lives in AuthContext, not Redux); TanStack Query owns all server state (profiles, addresses, orders, favorites); Redux Toolkit owns client-local cart state (`cartSlice.ts`); Expo Router owns navigation and route params (`returnTo`). No data mirroring. Sign-out clears customer-scoped query cache. |
| **V. Server Is Final Authority** | ✅ PASS | Client-side role checks and route gating are UX conveniences. Database trigger `handle_new_user` enforces `role = 'customer'` on registration. RLS policies protect `profiles`. `place_order` RPC validates server-side that caller has `role = 'customer'`. |
| **VI. Concurrency-Critical Writes Atomic** | ✅ PASS | Profile creation runs atomically in PostgreSQL inside a `SECURITY DEFINER` trigger on `auth.users` insert. Order placement runs atomically in the existing `place_order` RPC with `FOR UPDATE` row lock on coupons. |
| **VII. Historical Records Immutable** | ✅ PASS | Historical orders snapshot customer and address records at transaction time; untouched by auth modifications. |
| **VIII. Realtime/Push Separate** | ✅ PASS | Realtime session synchronization (`onAuthStateChange`) handled within auth infrastructure; push notifications remain separate. |
| **IX. Deferred Scope No Rewrites** | ✅ PASS | Phone/OTP login, password reset, social OAuth, and keychain/SecureStore migration are deferred without requiring future rewrites to `AuthRepository` domain interfaces. |
| **X. Practical MVP Simplicity** | ✅ PASS | No DI containers or extraneous abstraction layers. Uses route search params for return-to-context instead of complex global navigation state. AsyncStorage Option B preserved. |

**Gate Result**: ✅ **ALL CONSTITUTIONAL GATES PASS**

---

## Architectural & Implementation Decisions

### 1. Supabase Auth Session Persistence with AsyncStorage (Option B)
- **Decision**: Retain `@react-native-async-storage/async-storage` as the storage engine for the Supabase client (`src/shared/lib/supabase.ts`).
- **Rationale**: User explicitly selected Option B. Session persistence across app restarts is guaranteed by Supabase Auth's built-in token refresher and AsyncStorage adapter.
- **Rules**:
  - Do NOT import or install `expo-secure-store`.
  - Do NOT provide SecureStore as an alternative.
  - Do NOT store profile attributes or roles manually in AsyncStorage; AsyncStorage is only touched by the Supabase JS SDK for auth session tokens.

### 2. Route Reconciliation with the Post-001 Codebase
The application structure after feature 001 established a concrete 4-tab customer layout and dedicated routes. The auth plan aligns strictly with this structure:
- **Customer Navigation Layout** (`src/app/(customer)/_layout.tsx`):
  - Tab 1: `(home)` → Home / store list (`src/app/(customer)/(home)/index.tsx`), guest accessible.
  - Tab 2: `cart` → Cart screen (`src/app/(customer)/cart.tsx`), guest accessible.
  - Tab 3: `orders` → Order history (`src/app/(customer)/orders/index.tsx`), **protected action**.
  - Tab 4: `profile` → Customer profile (`src/app/(customer)/profile.tsx`), **protected action**.
- **Customer Stack / Detail Routes**:
  - `src/app/(customer)/(home)/store/[id].tsx` → Unified store details (restaurants & markets), guest accessible.
  - `src/app/(customer)/(home)/promotion/[id].tsx` → Promotion banner details, guest accessible.
  - `src/app/(customer)/(home)/restaurant/[id].tsx` → Existing legacy redirect shim forwarding to `store/[id].tsx`. Kept as a shim; not used as a primary route.
  - `src/app/(customer)/checkout/index.tsx` → Checkout screen, **protected action**.
  - `src/app/(customer)/addresses/index.tsx` → Saved delivery addresses, **protected action**.
  - `src/app/(customer)/favorites/stores.tsx` & `favorites/products.tsx` → Favorites screens, **protected action**.
  - `src/app/(customer)/orders/[id].tsx` → Order details screen, **protected action**.
- **No Product Detail Route**: There is no `product/[id].tsx`. Product add-on selection occurs entirely through the existing `AddOnSelectorModal` within the store detail view. The auth plan does not invent or reference any product detail screen.
- **Driver Navigation Layout** (`src/app/(driver)/_layout.tsx`):
  - Role-protected tab group for drivers: Available Orders (`available-orders/index.tsx`), Active Order (`active-order.tsx`), History (`history/index.tsx`), and Driver Profile (`profile.tsx`).

### 3. Integration with the Existing Redux Cart
- **Source of Truth**: The existing `src/shared/lib/store.ts` and `src/features/cart/application/cartSlice.ts` are the sole source of truth for cart state.
- **Preservation**: The existing cart implementation already features composite cart item IDs (`generateCartItemId`), quantity management, single-store conflict handling (`conflictState`, `StoreConflictModal`), and price calculations.
- **Rules**:
  - Do NOT create a second Redux store or move `store.ts`.
  - Do NOT create a duplicate cart slice or simplify existing cart features.
  - Do NOT clear or reset the cart during user sign-in or sign-up.
  - Redux cart state resides in memory in `AppProviders` and persists across route group navigations (`/(customer)` ↔ `/(auth)`).
  - If an authenticated driver launches the app, the driver navigation simply does not render the cart UI.

### 4. Supabase Generated Database Types as New Work
- **Status**: `src/shared/types/supabase.ts` does **not** currently exist in the repository.
- **Requirement**: Generating Supabase TypeScript types from the database schema is explicit **new work**.
- **Location**: Generated types will be placed at `src/shared/types/supabase.ts` and used to type Supabase client queries and repository implementations.

### 5. Unified File Naming Convention
The codebase strictly follows **PascalCase** for modules, entities, hooks, components, and repositories:
- `AuthRepository.ts`
- `AuthUser.ts`
- `useAuth.ts`
- `useRequireAuth.ts`
- `AuthContext.tsx`
- `SupabaseAuthRepository.ts`
- `UserProfile.ts`
- `ProfileRepository.ts`
- `useProfile.ts`
- `SupabaseProfileRepository.ts`
- `LoginForm.tsx`
- `RegisterForm.tsx`
- `ProfileErrorView.tsx`

Kebab-case naming (such as `use-auth.ts`, `auth-user.ts`) is strictly forbidden.

### 6. Driver Provisioning & Role Lifecycle
- **Self-Service Customer Registration**:
  - Public registration is strictly self-service for customers.
  - Registration UI accepts only 3 fields: `email`, `password`, `fullName`.
  - Registration NEVER displays a role selector.
  - The database trigger `handle_new_user` defaults every new registration to `role = 'customer'`.
- **Out-of-Band Driver Provisioning**:
  - Driver accounts cannot be created via public app registration.
  - Driver accounts are pre-seeded or provisioned out-of-band by an administrator or authorized backend process.
- **Shared Login Screen**:
  - Both customers and drivers log in through the shared login screen (`src/app/(auth)/login.tsx`).
  - Upon successful sign-in, the app loads the user's server-authoritative profile from the `profiles` table to read their `role`.
  - If `role === 'customer'`, user is routed to customer navigation or their attempted return context (`returnTo`).
  - If `role === 'driver'`, user is routed to driver navigation (`/(driver)/available-orders`).
- **Security & Authorization**:
  - The client must never allow a user to self-promote to driver.
  - Client-controlled metadata (such as `raw_user_meta_data.role`) is never trusted as an authorization source.
  - Server-side RLS and database RPCs remain the sole authority.

### 7. Email Confirmation Flow Handling
Supabase Auth may have email confirmation enabled or disabled depending on environment settings. The app must handle both behaviors gracefully:
- **When Email Confirmation is Enabled**:
  - Calling `supabase.auth.signUp()` creates the user in `auth.users`, but returns `session === null`.
  - The registration UI must detect `session === null` and display a clear confirmation state instructing the user:
    > *"Account created! Please check your email to confirm your account before signing in."*
  - The app does not assume an immediate authenticated session. The user is provided a button to return to the Login screen with `returnTo` preserved.
- **When Email Confirmation is Disabled (or Auto-confirmed)**:
  - `signUp()` immediately returns a valid `Session` and `User`.
  - The trigger `handle_new_user` has already executed, creating the customer profile.
  - The app transitions to the authenticated state and routes to the original `returnTo` destination (or customer home) with the guest cart intact.

### 8. Sign-Out & TanStack Query Cache Purge
To prevent sensitive customer data leakage between different users on the same device:
- **Cache Isolation**: Customer-scoped server state stored in TanStack Query (profile, addresses, favorites, orders, order details, driver info) must be cleared upon sign-out.
- **Sign-Out Sequence**:
  1. Call `supabase.auth.signOut()` via `AuthRepository`.
  2. Clear and reset the TanStack Query cache via `queryClient.clear()`.
  3. Reset in-memory auth and profile state in `AuthContext`.
  4. Navigate the user back to the unauthenticated guest browsing home screen (`/(customer)/(home)`).
  5. The guest cart in Redux is preserved unless the user explicitly clears it.
- **Centralization**: Sign-out logic is centralized in `AuthContext` / `useAuth`, ensuring that calling `signOut()` from anywhere in the app consistently purges the query cache.

### 9. Reactive Session Synchronization via `onAuthStateChange`
- **Initial Resolution**: On app launch, `AuthProvider` calls `supabase.auth.getSession()` to restore any persisted session from AsyncStorage.
- **Reactive Listener**: `AuthProvider` subscribes to `supabase.auth.onAuthStateChange((event, session) => ...)`:
  - `INITIAL_SESSION`: Resolves the startup session.
  - `SIGNED_IN`: Updates session state and initiates profile loading.
  - `SIGNED_OUT`: Clears auth state and triggers cache purge.
  - `TOKEN_REFRESHED`: Updates the current session token transparently.
  - `USER_UPDATED`: Refreshes user details.
- **Cleanup**: The subscription's `unsubscribe()` is called when `AuthProvider` unmounts.
- **No Premature Redirection**: Splash screen remains visible and no redirects occur while `isLoading` is true, preventing visual flashing.

### 10. Server-Authoritative Roles & Profile Data
- **Supabase Auth (`auth.users`)**: Owns authentication identity, user UUID (`id`), email, encrypted password, and session access/refresh tokens.
- **Database Table (`public.profiles`)**: Owns the application role (`role: 'customer' | 'driver'`), full name (`full_name`), phone, and avatar.
- **Derivation**: `AuthUser` in domain represents the authenticated session user (`id`, `email`). The user's role is obtained directly from `UserProfile` fetched from `public.profiles`.
- No conflicting role values are stored in Redux, AuthContext, AsyncStorage, or auth metadata.

### 11. Server-Side Automatic Profile Creation Trigger
- **Database Trigger**: An `AFTER INSERT ON auth.users` trigger invokes the `SECURITY DEFINER` function `public.handle_new_user()`.
- **Function Behavior**:
  ```sql
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
  ```
- **Guarantees**:
  - The profile row is created atomically with the user account before any client query runs.
  - Role is hardcoded to `'customer'`.
  - The function runs with `SECURITY DEFINER` privileges, bypassing user RLS so no public `INSERT` policy on `profiles` is needed or exposed.
- **Missing Profile Error State**: If `profiles` lookup fails after login (e.g., database constraint failure or network error), `AuthContext` sets a `profile_not_found` error state. The root layout displays `ProfileErrorView` with options to retry profile fetching or sign out.

### 12. Startup, Authentication & Routing Flow

```text
                                  ┌─────────────┐
                                  │ App Launch  │
                                  └──────┬──────┘
                                         │
                         ┌───────────────▼───────────────┐
                         │  SplashScreen prevents hide   │
                         │ AuthProvider reads AsyncStorage│
                         └───────────────┬───────────────┘
                                         │
                                ┌────────▼────────┐
                                │ Session exists? │
                                └───┬─────────┬───┘
                                    │         │
                            No ─────┘         └───── Yes
                            │                        │
               ┌────────────▼────────────┐  ┌────────▼────────────────┐
               │ Guest Browsing Allowed  │  │  Fetch profile from DB  │
               │ Hide Splash             │  │  (public.profiles)      │
               │ Route to (customer)     │  └────────┬────────────────┘
               └─────────────────────────┘           │
                                            ┌────────▼────────┐
                                            │ Profile status? │
                                            └───┬─────┬─────┬─┘
                                                │     │     │
                             role = 'customer' ─┘     │     └── profile missing/error
                             │                        │         │
                ┌────────────▼────────────┐           │  ┌──────▼──────────────────┐
                │ Hide Splash             │           │  │ Hide Splash             │
                │ Route to (customer)     │           │  │ Render ProfileErrorView │
                │ Cart preserved          │           │  │ (Retry or Sign Out)     │
                └─────────────────────────┘           │  └─────────────────────────┘
                                                      │
                                       role = 'driver'┘
                                       │
                          ┌────────────▼────────────┐
                          │ Hide Splash             │
                          │ Route to (driver)       │
                          │ (available-orders)      │
                          └─────────────────────────┘
```

### 13. Protected Actions & Return-to-Context Pattern

#### A. Guest Capabilities (Unrestricted)
- Browse the catalog on `/(customer)/(home)/index.tsx`.
- Open any store detail on `/(customer)/(home)/store/[id].tsx`.
- Browse categories and products.
- Open `AddOnSelectorModal` to select customizations/add-ons.
- Add items to cart and manage cart contents on `/(customer)/cart.tsx`.

#### B. Protected Actions Requiring Authentication
- Proceeding to Checkout (`/(customer)/checkout/index.tsx`).
- Favoriting a store or product (heart toggle via `FavoriteButton.tsx`).
- Viewing or navigating to Order History (`/(customer)/orders/index.tsx` and `[id].tsx`).
- Viewing or managing Saved Delivery Addresses (`/(customer)/addresses/index.tsx`).
- Viewing or navigating to Customer Profile (`/(customer)/profile.tsx`).

#### C. Return-to-Context Navigation Mechanism
To return the user to their original attempted context without introducing global state or coupling Domain/Application logic to the router:
1. **Initiating Auth with a Return Target**:
   When a guest attempts a protected screen or action, `useRequireAuth()` or the triggering component captures the intended target path and navigates to the auth screen via Expo Router search parameters:
   ```typescript
   // Example inside useRequireAuth or action handler
   router.push({
     pathname: '/(auth)/login',
     params: { returnTo: destinationPath },
   });
   ```
2. **Preserving Return Target Across Auth Screens**:
   If the user navigates between `login.tsx` and `register.tsx` (`"Don't have an account? Register"` or `"Already have an account? Login"`), the `returnTo` search parameter is passed along so switching forms does not lose the return target.
3. **Handling Authentication Outcomes**:
   - **Auth Failure**: If credentials are wrong or registration fails, the user remains on the auth screen; the inline error is displayed and the `returnTo` search parameter is preserved.
   - **Successful Customer Authentication**:
     When sign-in or sign-up succeeds and `profile.role === 'customer'`:
     - If `returnTo` is present and corresponds to a valid customer destination (e.g., `/(customer)/checkout`, `/(customer)/favorites/stores`, `/(customer)/orders`, `/(customer)/profile`, `/(customer)/addresses`): navigate to the target via `router.replace(returnTo)`.
     - If `returnTo` is missing or invalid: fall back safely to `/(customer)/(home)`.
   - **Successful Driver Authentication**:
     When sign-in succeeds and `profile.role === 'driver'`:
     - Driver routing rules strictly take precedence: navigate to `/(driver)/available-orders`. Any customer `returnTo` parameter is disregarded, because drivers cannot access customer workflows.
4. **Guest Cart Invariance**:
   The Redux cart store in memory (`cartSlice.ts`) is never cleared, reset, or recreated during the auth flow. When a customer returns to `/checkout`, all cart items, selected add-ons, and store IDs are completely preserved.
5. **Decoupled Architecture**:
   Domain and Application layers (`AuthRepository`, `ProfileRepository`, `AuthContext`) remain 100% decoupled from Expo Router. `AuthContext` exposes authentication methods and user state; the Presentation components (`LoginForm.tsx`, `RegisterForm.tsx`, `useRequireAuth.ts`) read route params via `useLocalSearchParams<{ returnTo?: string }>()` and execute router transitions.

#### D. Concrete End-to-End Examples

- **Example 1: Cart Checkout Return Flow**:
  1. Guest visits `/(customer)/(home)/store/[id]` and customizes a burger with extra cheese via `AddOnSelectorModal`.
  2. Item is added to Redux cart; guest taps the Cart tab `/(customer)/cart`.
  3. Guest taps `"Proceed to Checkout"`.
  4. App intercepts the unauthenticated state and routes to `/(auth)/login?returnTo=%2F(customer)%2Fcheckout`.
  5. Guest enters credentials and logs in (or registers as a new customer).
  6. Server confirms customer role. `LoginForm` reads `returnTo` and executes `router.replace('/(customer)/checkout')`.
  7. User arrives at `/checkout` with their burger, extra cheese add-on, and store ID fully intact in the cart.

- **Example 2: Favorite Action Return Flow**:
  1. Guest is browsing `/(customer)/(home)/store/[id]` and taps the heart button (`FavoriteButton`) or taps the `"Favorite Stores"` link in Profile.
  2. Component detects unauthenticated state and navigates to `/(auth)/login?returnTo=%2F(customer)%2Ffavorites%2Fstores`.
  3. User completes authentication as a customer.
  4. App routes user to `/(customer)/favorites/stores`.

- **Example 3: Order History Return Flow**:
  1. Guest taps the `Orders` tab in the bottom tab bar.
  2. `src/app/(customer)/orders/index.tsx` detects no authenticated customer session and navigates to `/(auth)/login?returnTo=%2F(customer)%2Forders`.
  3. User authenticates.
  4. App routes user directly to `/(customer)/orders`, displaying their previous orders.

- **Example 4: Profile & Saved Addresses Return Flow**:
  1. Guest taps the `Profile` tab or directly accesses `/(customer)/addresses/index.tsx`.
  2. Screen intercepts and navigates to `/(auth)/login?returnTo=%2F(customer)%2Faddresses`.
  3. User authenticates.
  4. App routes user directly to `/(customer)/addresses` with full address management available.

- **Example 5: Driver Sign-In During Protected Customer Action**:
  1. Guest builds a cart and taps `"Proceed to Checkout"` (`returnTo=/(customer)/checkout`).
  2. User signs in using driver credentials.
  3. App resolves `profile.role === 'driver'`.
  4. App disregards the customer checkout `returnTo` and immediately routes the driver to `/(driver)/available-orders`.

---

### 14. Driver Route Group Protection
- `src/app/(driver)/_layout.tsx` validates authorization for all driver routes:
  - Uses `useAuth()` to verify that an active session exists.
  - Verifies that `profile?.role === 'driver'`.
  - If unauthenticated, redirects to `/(auth)/login`.
  - If authenticated as a customer, redirects to `/(customer)/(home)`.
  - Performs no business logic directly in the layout; authorization status is supplied by `AuthContext`.

---

### 15. Server-Side Restriction: Complete Executable `place_order` Migration
- **Database Level Protection**: In addition to client route gating, the PostgreSQL `place_order` RPC must enforce that only users with `role = 'customer'` can execute an order placement.
- **Complete In-Place Replacement**: A new migration (`supabase/migrations/20260919000002_place_order_customer_role_check.sql`) updates `place_order` using `CREATE OR REPLACE FUNCTION public.place_order(p_payload JSONB)`.
- **Preservation of All 21 Checkout Guarantees**:
  The migration must contain the **full, complete, executable SQL definition** without any placeholders, preserving all Catalog checkout guarantees:
  1. Customer authentication through `auth.uid()`.
  2. Server-side customer-role authorization (`role = 'customer'` check from `public.profiles`).
  3. Store existence and open/closed validation.
  4. Canonical product lookup.
  5. Product availability validation.
  6. Canonical product prices.
  7. Add-on validation and canonical add-on prices.
  8. Cart quantity validation.
  9. Coupon validation and eligibility.
  10. Authoritative server-side discount calculation.
  11. Concurrency-safe coupon redemption handling (`FOR UPDATE` row lock).
  12. Delivery address ownership validation.
  13. Immutable delivery-address snapshot.
  14. Immutable order-item/product snapshots.
  15. Add-on snapshots.
  16. Authoritative subtotal/discount/delivery-fee/total calculation.
  17. Atomic order creation.
  18. Atomic order-item creation.
  19. Atomic coupon redemption update/insert.
  20. No client-supplied price or total is trusted.
  21. Rollback of the entire transaction if any validation or write fails.
- **Migration Dependency & Ordering**:
  - `20260916000005_place_order_rpc.sql` initially introduced `place_order`.
  - `20260919000001_auth_profile_trigger.sql` creates the `handle_new_user` trigger ensuring all newly registered users have a profile with `role = 'customer'`.
  - `20260919000002_place_order_customer_role_check.sql` replaces `place_order` to query `public.profiles.role` for `auth.uid()` and raise `'ONLY_CUSTOMERS_CAN_PLACE_ORDERS'` if the user does not exist or has a driver role.

---

### 16. State Ownership Model

| Concern | Owner | Storage / Lifetime | Invalidation / Reset Trigger |
|---|---|---|---|
| **Auth Session** | `AuthContext` | Memory + AsyncStorage (Supabase tokens) | Explicit `signOut()`, session expiration |
| **User Profile** | TanStack Query | Query cache (`['profile', userId]`) | Invalidate on update, purged on `signOut()` |
| **Customer Data** (addresses, orders, favorites) | TanStack Query | Query cache (`['addresses', customerId]`, etc.) | Purged on `signOut()` via `queryClient.clear()` |
| **Cart Items & Conflict State** | Redux Toolkit | Redux Store in memory (`cartSlice.ts`) | User manual clear or `clearAndAddItem` conflict |
| **Navigation & Active Screen** | Expo Router | Router state & search params (`returnTo`) | Layout `<Redirect>` and route transitions |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-auth-and-onboarding/
├── plan.md              # This implementation plan
├── spec.md              # Feature specification
├── research.md          # Architectural research and decision records
├── data-model.md        # Entities, validation rules, and schema triggers
├── quickstart.md        # Manual acceptance validation scenarios
└── contracts/
    └── auth-api.md      # Supabase Auth, Profiles, and RPC contracts
```

### Source Code Reconciliation

#### 1. Existing and Reused (Unchanged)
The following files already exist in the codebase from feature 001 and are **preserved without modification**:
```text
src/
├── app/
│   ├── (customer)/
│   │   ├── (home)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx                        # Home catalog browsing (guest accessible)
│   │   │   ├── store/[id].tsx                   # Unified store detail (guest accessible)
│   │   │   ├── promotion/[id].tsx               # Promotion detail (guest accessible)
│   │   │   └── restaurant/[id].tsx              # Legacy redirect shim to store/[id].tsx
│   │   └── _layout.tsx                          # 4-tab customer layout (Home, Cart, Orders, Profile)
│   └── (driver)/
│       ├── active-order.tsx
│       ├── available-orders/
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   └── [id].tsx
│       ├── history/
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   └── [id].tsx
│       └── profile.tsx
├── features/
│   ├── addresses/                               # Address domain, repositories, components
│   │   ├── domain/entities/SavedDeliveryAddress.ts
│   │   ├── domain/repositories/AddressRepository.ts
│   │   ├── infrastructure/SupabaseAddressRepository.ts
│   │   ├── presentation/AddressCard.tsx
│   │   └── presentation/AddressSelectionModal.tsx
│   ├── cart/                                    # Existing Redux Cart (DO NOT duplicate or replace)
│   │   ├── application/cartSlice.ts             # Composite keys, conflict prompt, selectors
│   │   ├── application/useAddToCart.ts
│   │   ├── domain/cartUtils.ts
│   │   ├── domain/entities/CartItem.ts
│   │   ├── presentation/CartItemRow.tsx
│   │   └── presentation/StoreConflictModal.tsx
│   ├── drivers/                                 # Driver domain and repositories
│   ├── favorites/                               # Favorites repositories and button
│   │   ├── domain/entities/Favorite.ts
│   │   ├── domain/repositories/FavoritesRepository.ts
│   │   └── infrastructure/SupabaseFavoritesRepository.ts
│   ├── orders/                                  # Orders domain, repositories, snapshots
│   ├── products/                                # Products domain and AddOnSelectorModal
│   │   ├── domain/entities/Product.ts
│   │   ├── domain/entities/ProductAddOn.ts
│   │   └── presentation/AddOnSelectorModal.tsx
│   ├── promotions/                              # Coupons, promotions, repositories
│   └── restaurants/                             # Store categories, cards, repositories
├── shared/
│   ├── lib/
│   │   ├── queryClient.ts                       # TanStack Query client instance
│   │   ├── store.ts                             # Redux store configuration with cart
│   │   └── supabase.ts                          # Supabase client with AsyncStorage adapter
│   ├── types/common.ts
│   ├── ui/components/                           # Button, Input, LoadingSpinner, ErrorView, EmptyState
│   ├── ui/theme/                                # colors, spacing, typography
│   └── utils/                                   # formatting, validation
└── supabase/migrations/                         # Migrations 000000 through 000000_security_hardening
```

#### 2. Existing and Modified
The following existing files will be updated to integrate authentication:
```text
src/
├── app/
│   ├── _layout.tsx                              # Manage expo-splash-screen while AuthProvider initializes
│   ├── index.tsx                                # Startup router: guests -> (customer), driver -> (driver)
│   ├── (auth)/
│   │   ├── _layout.tsx                          # Auth stack header styling and back behavior
│   │   ├── login.tsx                            # Replace placeholder with LoginForm component (handles returnTo)
│   │   └── register.tsx                         # Replace placeholder with RegisterForm component (handles returnTo)
│   ├── (customer)/
│   │   ├── cart.tsx                             # Gate "Proceed to Checkout" with useRequireAuth(returnTo: '/(customer)/checkout')
│   │   ├── checkout/index.tsx                   # Gate checkout screen with useRequireAuth(returnTo: '/(customer)/checkout')
│   │   ├── addresses/index.tsx                  # Gate addresses screen with useRequireAuth(returnTo: '/(customer)/addresses')
│   │   ├── favorites/
│   │   │   ├── stores.tsx                       # Gate favorite stores screen with useRequireAuth(returnTo: '/(customer)/favorites/stores')
│   │   │   └── products.tsx                     # Gate favorite products screen with useRequireAuth(returnTo: '/(customer)/favorites/products')
│   │   ├── orders/
│   │   │   ├── index.tsx                        # Gate order history screen with useRequireAuth(returnTo: '/(customer)/orders')
│   │   │   └── [id].tsx                         # Gate order details screen with useRequireAuth
│   │   └── profile.tsx                          # Gate with useRequireAuth; use centralized signOut()
│   └── (driver)/
│       └── _layout.tsx                          # Role protection: enforce session and profiles.role === 'driver'
├── features/
│   ├── auth/
│   │   ├── domain/entities/User.ts              # Refine User/AuthUser entity contract
│   │   └── domain/repositories/AuthRepository.ts# Update RegisterInput (remove role, add email confirmation support)
│   ├── favorites/
│   │   └── presentation/FavoriteButton.tsx      # Redirect unauthenticated guests to login on tap with returnTo
│   └── profile/
│       └── domain/repositories/ProfileRepository.ts# Update ProfileRepository interface to return UserProfile
├── providers/
│   └── AppProviders.tsx                         # Mount AuthProvider wrapping children with QueryClient & Redux
└── shared/
    └── lib/auth.ts                              # Reconcile or delegate useCurrentCustomerId to useAuth
```

#### 3. Genuinely New
The following files are new and will be created:
```text
src/
├── features/
│   ├── auth/
│   │   ├── application/
│   │   │   ├── context/
│   │   │   │   └── AuthContext.tsx              # AuthProvider, onAuthStateChange listener, session state
│   │   │   └── hooks/
│   │   │       └── useAuth.ts                   # Hook exposing user, session, profile, signIn, signUp, signOut
│   │   ├── infrastructure/
│   │   │   └── SupabaseAuthRepository.ts        # Supabase Auth SDK implementation of AuthRepository
│   │   └── presentation/
│   │       ├── hooks/
│   │       │   └── useRequireAuth.ts            # Presentation hook guarding protected actions/screens and providing returnTo
│   │       └── components/
│   │           ├── LoginForm.tsx                # Combined sign-in form with returnTo handling and error display
│   │           ├── RegisterForm.tsx             # 3-field customer registration form (no role selector, returnTo handling)
│   │           └── ProfileErrorView.tsx         # Dedicated error state when profile record cannot be found
│   └── profile/
│       ├── domain/
│       │   └── entities/
│       │       └── UserProfile.ts               # UserProfile entity (id, fullName, role, phone, avatarUrl)
│       ├── application/
│       │   └── hooks/
│       │       └── useProfile.ts                # TanStack Query hook fetching server-authoritative profile
│       └── infrastructure/
│           └── SupabaseProfileRepository.ts     # Supabase implementation fetching from public.profiles
└── shared/
    └── types/
        └── supabase.ts                          # Supabase generated database TypeScript definitions

supabase/migrations/
├── 20260919000001_auth_profile_trigger.sql      # handle_new_user() trigger function on auth.users insert
└── 20260919000002_place_order_customer_role_check.sql # Complete executable place_order RPC with customer role check
```

---

## Database Schema & Migration Requirements

### 1. Profile Auto-Creation Trigger Migration
**File**: `supabase/migrations/20260919000001_auth_profile_trigger.sql`
```sql
-- Trigger function to automatically create a customer profile upon auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$;

-- Drop trigger if it previously existed to allow idempotent migrations
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

### 2. Driver Order Placement Prevention Migration (Complete Executable Definition)
**File**: `supabase/migrations/20260919000002_place_order_customer_role_check.sql`

```sql
-- Complete executable update for place_order RPC:
-- 1. Enforces customer authentication (auth.uid() IS NOT NULL)
-- 2. Enforces server-side customer role authorization (profiles.role = 'customer')
-- 3. Preserves all 21 catalog checkout guarantees (store check, canonical prices,
--    coupon row-lock, immutable snapshots, atomic order & item insertion).
CREATE OR REPLACE FUNCTION public.place_order(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_customer_id UUID;
  v_user_role TEXT;
  v_store_id UUID;
  v_store_name TEXT;
  v_store_is_open BOOLEAN;
  v_address_id UUID;
  v_address_text TEXT;
  v_address_label TEXT;
  v_item JSONB;
  v_product RECORD;
  v_addon_id TEXT;
  v_addon RECORD;
  v_addons_json JSONB;
  v_addon_subtotal INTEGER;
  v_line_subtotal INTEGER;
  v_subtotal INTEGER := 0;
  v_items_json JSONB := '[]'::jsonb;
  v_coupon RECORD;
  v_coupon_id UUID := NULL;
  v_discount INTEGER := 0;
  v_delivery_fee INTEGER := 0;
  v_final_total INTEGER;
  v_order_id UUID;
  v_order JSONB;
BEGIN
  -- 1. Authentication check
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  v_customer_id := auth.uid();

  -- 2. Server-side customer-role authorization check (Drivers cannot place customer orders)
  SELECT role::text INTO v_user_role
  FROM public.profiles
  WHERE id = v_customer_id;

  IF NOT FOUND OR v_user_role <> 'customer' THEN
    RAISE EXCEPTION 'ONLY_CUSTOMERS_CAN_PLACE_ORDERS';
  END IF;

  -- 3. Store validation
  v_store_id := (p_payload->>'store_id')::uuid;
  SELECT name, is_open INTO v_store_name, v_store_is_open
  FROM public.restaurants WHERE id = v_store_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STORE_NOT_FOUND';
  END IF;
  IF v_store_is_open IS NOT TRUE THEN
    RAISE EXCEPTION 'STORE_CLOSED';
  END IF;

  -- 4. Delivery address validation & immutable snapshot
  v_address_id := (p_payload->>'delivery_address_id')::uuid;
  SELECT address_text, label INTO v_address_text, v_address_label
  FROM public.saved_addresses
  WHERE id = v_address_id AND customer_id = v_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ADDRESS_NOT_FOUND';
  END IF;

  -- 5. Canonical price validation for items and add-ons
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_payload->'items', '[]'::jsonb))
  LOOP
    IF COALESCE((v_item->>'quantity')::int, 0) < 1 THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
    END IF;

    SELECT id, name, price, is_available INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
      AND restaurant_id = v_store_id;
    IF NOT FOUND OR v_product.is_available IS NOT TRUE THEN
      RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
    END IF;

    v_addons_json := '[]'::jsonb;
    v_addon_subtotal := 0;

    FOR v_addon_id IN SELECT jsonb_array_elements_text(COALESCE(v_item->'addon_ids', '[]'::jsonb))
    LOOP
      SELECT id, name, price, is_available INTO v_addon
      FROM public.product_add_ons
      WHERE id = v_addon_id::uuid AND product_id = v_product.id;
      IF NOT FOUND OR v_addon.is_available IS NOT TRUE THEN
        RAISE EXCEPTION 'ADDON_UNAVAILABLE';
      END IF;
      v_addons_json := v_addons_json || jsonb_build_object(
        'addon_id', v_addon.id,
        'name', v_addon.name,
        'price', v_addon.price
      );
      v_addon_subtotal := v_addon_subtotal + v_addon.price;
    END LOOP;

    v_line_subtotal := (v_product.price + v_addon_subtotal) * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_line_subtotal;

    v_items_json := v_items_json || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'quantity', (v_item->>'quantity')::int,
      'unit_price', v_product.price,
      'addon_snapshots', v_addons_json,
      'subtotal', v_line_subtotal
    );
  END LOOP;

  IF jsonb_array_length(v_items_json) = 0 THEN
    RAISE EXCEPTION 'PRODUCT_UNAVAILABLE';
  END IF;

  -- 6. Coupon validation & redemption (single coupon, row-locked)
  IF COALESCE(p_payload->>'coupon_code', '') <> '' THEN
    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE code = UPPER(TRIM(p_payload->>'coupon_code'))
    FOR UPDATE;
    IF NOT FOUND OR v_coupon.is_active IS NOT TRUE THEN
      RAISE EXCEPTION 'COUPON_INVALID';
    END IF;
    IF now() < v_coupon.starts_at
       OR (v_coupon.expires_at IS NOT NULL AND now() > v_coupon.expires_at) THEN
      RAISE EXCEPTION 'COUPON_EXPIRED';
    END IF;
    IF v_coupon.store_id IS NOT NULL AND v_coupon.store_id <> v_store_id THEN
      RAISE EXCEPTION 'COUPON_STORE_RESTRICTED';
    END IF;
    IF v_coupon.min_order_amount IS NOT NULL AND v_subtotal < v_coupon.min_order_amount THEN
      RAISE EXCEPTION 'COUPON_MIN_ORDER_NOT_MET';
    END IF;
    IF v_coupon.max_redemptions IS NOT NULL AND v_coupon.current_redemptions >= v_coupon.max_redemptions THEN
      RAISE EXCEPTION 'COUPON_USAGE_LIMIT_REACHED';
    END IF;

    IF v_coupon.discount_type = 'fixed_amount' THEN
      v_discount := LEAST(v_coupon.discount_value, v_subtotal);
    ELSE
      v_discount := ROUND((v_subtotal::numeric * v_coupon.discount_value) / 100.0);
      IF v_coupon.max_discount_amount IS NOT NULL THEN
        v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
      END IF;
    END IF;
    v_discount := LEAST(v_discount, v_subtotal);

    UPDATE public.coupons
    SET current_redemptions = current_redemptions + 1
    WHERE id = v_coupon.id;
    v_coupon_id := v_coupon.id;
  END IF;

  -- 7. Totals (delivery fee fixed at 0 in the foundation phase)
  v_final_total := v_subtotal - v_discount + v_delivery_fee;

  -- 8. Immutable snapshot persistence
  INSERT INTO public.orders (
    customer_id, restaurant_id, restaurant_name, status,
    delivery_address, delivery_address_label, payment_method,
    coupon_code, discount_amount, subtotal_amount, delivery_fee, total_amount
  ) VALUES (
    v_customer_id, v_store_id, v_store_name, 'pending',
    v_address_text, v_address_label, 'cash_on_delivery',
    NULLIF(TRIM(p_payload->>'coupon_code'), ''), v_discount, v_subtotal, v_delivery_fee, v_final_total
  ) RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, quantity, unit_price,
    addon_snapshots, subtotal
  )
  SELECT
    v_order_id,
    (item->>'product_id')::uuid,
    item->>'product_name',
    (item->>'quantity')::int,
    (item->>'unit_price')::int,
    item->'addon_snapshots',
    (item->>'subtotal')::int
  FROM jsonb_array_elements(v_items_json) AS item;

  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_redemptions (coupon_id, order_id, customer_id, discount_amount)
    VALUES (v_coupon_id, v_order_id, v_customer_id, v_discount);
  END IF;

  -- 9. Return serialized order (camelCase, matching the Order entity)
  SELECT to_jsonb(o) INTO v_order FROM public.orders o WHERE o.id = v_order_id;

  RETURN jsonb_build_object(
    'id', v_order->>'id',
    'customerId', v_order->>'customer_id',
    'driverId', v_order->>'driver_id',
    'storeId', v_order->>'restaurant_id',
    'storeName', v_order->>'restaurant_name',
    'status', v_order->>'status',
    'deliveryAddressSnapshot', v_order->>'delivery_address',
    'deliveryAddressLabel', v_order->>'delivery_address_label',
    'paymentMethod', v_order->>'payment_method',
    'couponCode', v_order->>'coupon_code',
    'discountAmount', v_order->>'discount_amount',
    'subtotalAmount', v_order->>'subtotal_amount',
    'deliveryFee', v_order->>'delivery_fee',
    'totalAmount', v_order->>'total_amount',
    'createdAt', v_order->>'created_at',
    'acceptedAt', v_order->>'accepted_at',
    'deliveredAt', v_order->>'delivered_at',
    'updatedAt', v_order->>'updated_at',
    'items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', oi.id,
        'orderId', oi.order_id,
        'productId', oi.product_id,
        'productName', oi.product_name,
        'unitPrice', oi.unit_price,
        'quantity', oi.quantity,
        'subtotal', oi.subtotal,
        'addonSnapshots', oi.addon_snapshots
      )), '[]'::jsonb)
      FROM public.order_items oi WHERE oi.order_id = v_order_id
    )
  );
END;
$$;
```

---

## Acceptance & Validation Scenarios

The implementation must fulfill all 25 acceptance scenarios:

1. **Guest Browsing Home Screen**: First-time or logged-out visitor launches the app and immediately views the full catalog of stores and promotions on `/(customer)/(home)/index.tsx` without encountering any auth wall.
2. **Guest Open Store**: Visitor taps on any store card and successfully navigates to `/(customer)/(home)/store/[id].tsx` to view categories, products, and operational status.
3. **Guest Add-On Selection**: Visitor taps a product in the store detail view and customizes options using the existing `AddOnSelectorModal`.
4. **Guest Build Cart**: Visitor adds customized items to the cart; items are recorded in the existing Redux cart (`cartSlice.ts`) and the cart badge increments.
5. **Guest Checkout Gating with Return Target**: Visitor navigates to `/(customer)/cart.tsx` and taps "Proceed to Checkout"; the app intercepts the action and navigates to `/(auth)/login?returnTo=%2F(customer)%2Fcheckout`.
6. **Guest Cart Preserved and Checkout Context Restored**: After completing sign-in or sign-up as a customer, the user is returned directly to `/(customer)/checkout` with all previously added cart items and add-ons completely intact.
7. **Guest Favorites Gating with Return Target**: Visitor taps the heart icon (`FavoriteButton`) on a store or product or attempts to open `/(customer)/favorites/*`; the app navigates to `/(auth)/login?returnTo=...`. After customer auth, the user returns to the attempted screen/action.
8. **Guest Orders/Profile/Addresses Gating with Return Target**: Visitor attempts to navigate to `orders`, `profile`, or `addresses`; the app captures the destination in `returnTo` and navigates to `/(auth)/login`. After customer auth, user lands directly on that destination.
9. **Return to Usable Context**: After successful customer authentication from a protected action prompt, the user returns to the specific valid `returnTo` destination; if missing or invalid, falls back safely to `/(customer)/(home)`. Driver authentication always routes to `/(driver)/available-orders`, disregarding customer return targets.
10. **Customer Automatic Profile Creation**: When a user registers via `RegisterForm`, the database trigger `handle_new_user` automatically creates a corresponding row in `public.profiles` with `role = 'customer'` and the submitted `full_name`.
11. **Registration Omits Role Selection**: The registration screen exposes only `email`, `password`, and `fullName` fields; no role selector exists in the UI.
12. **Driver Account Provisioning & Shared Login**: A pre-seeded/out-of-band provisioned driver enters their credentials on `/(auth)/login` without selecting any role toggle.
13. **Customer Login Routing**: Authenticating with customer credentials without a `returnTo` target navigates the user to the customer home experience.
14. **Driver Login Routing**: Authenticating with driver credentials automatically navigates the user to the driver navigation (`/(driver)/available-orders`), even if a customer `returnTo` param was present.
15. **Driver Customer Path Gating**: A logged-in driver attempting to access customer routes is redirected away, and customer tabs are not visible.
16. **Driver Order Placement Blocked Server-Side**: Calling `place_order` with a driver account raises the exception `'ONLY_CUSTOMERS_CAN_PLACE_ORDERS'` and atomically rolls back the transaction.
17. **Email Confirmation Required Flow**: When Supabase requires email verification (`session === null` on `signUp`), the registration UI displays clear confirmation instructions with `returnTo` preserved for when they log in.
18. **Session Persistence Across App Restarts**: Closing and relaunching the app reads the persisted session from AsyncStorage via Supabase Auth and lands the user back in their role experience without prompting for credentials.
19. **Reactive State Synchronization**: `onAuthStateChange` reacts immediately to sign-in, sign-out, and token refresh events, keeping `AuthContext` synchronized.
20. **Sign-Out Purges TanStack Query Cache**: Calling `signOut()` invokes `queryClient.clear()`, wiping all cached customer data.
21. **No Cross-User Cache Leakage**: After logging out of User A's account, logging in as User B never renders User A's addresses, favorites, or orders from the query cache.
22. **Sign-Out Returns to Guest Browsing**: Tapping Sign Out in `CustomerProfileScreen` signs the user out, resets auth state, and returns the app to `/(customer)/(home)`.
23. **Missing Profile Recoverable Error**: If an authenticated user has no matching row in `public.profiles`, `ProfileErrorView` displays an explanation with "Retry" and "Sign Out" actions.
24. **Driver Layout Enforces Driver Role**: Direct navigation to any route under `src/app/(driver)/` validates that `profile.role === 'driver'`; unauthorized users are redirected.
25. **Existing Cart Preserved Without Duplication**: Cart actions use composite keys (`generateCartItemId`) and single-store conflict modal (`StoreConflictModal`), and existing behavior is not replaced or duplicated.

---

## Complexity Tracking

> **No Constitution violations requiring justification.**
> 
> All decisions strictly align with Principles I–X:
> - Option B AsyncStorage is an explicit, ratified MVP tradeoff (Principle X).
> - Server-authoritative roles and database trigger prevent client-side elevation (Principle V).
> - Post-001 route and Redux cart structures are respected and preserved without duplication (Principles I, IV).
> - Lightweight return-to-context uses native Expo Router search params, preserving clean architecture without global navigation state bloat (Principles II, X).
