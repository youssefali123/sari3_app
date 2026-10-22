# Research: Error Handling & Resilience

**Feature Branch**: `012-error-handling-resilience`  
**Date**: 2026-10-22  
**Spec**: [specs/012-error-handling-resilience/spec.md](spec.md)

---

## 1. Error Classification & Localization Architecture

### Context & Problem
Currently, Supabase and PostgreSQL errors bubble up as raw JavaScript `Error(error.message)`. In presentation code across 15+ screens and components, raw error strings (such as `'STORE_CLOSED'`, `'PRODUCT_UNAVAILABLE'`, `'orders_column_guard: ...'`, and PostgreSQL codes like `42501`, `23505`) are rendered directly or passed into `showAlert('...', error.message)`. This violates Principle II (domain purity) and creates a confusing, untrusted user experience.

### Decision
1. **Typed Domain Errors**: Define a lightweight, generic `AppError` in `src/shared/types/errors.ts` and per-feature error types in each feature's domain layer:
   ```typescript
   export interface AppError<TKind extends string = string> {
     readonly kind: TKind;
     readonly originalError?: unknown;
     readonly message?: string; // Optional English debug context, NEVER displayed to users
   }
   ```
2. **Infrastructure Error Classification**: Create pure mapper functions in each infrastructure repository (e.g., `classifyOrderError(error: unknown): OrderError`, `classifyDriverError(error: unknown): DriverError`). These mappers inspect:
   - PostgreSQL error codes (`23505` unique violation, `42501` insufficient privilege / auth, `P0002` not found).
   - Known custom PostgreSQL exception strings (`STORE_CLOSED`, `PRODUCT_UNAVAILABLE`, `ACTIVE_ORDERS_EXIST`, `ORDER_CANNOT_BE_CANCELLED`, `DRIVER_ALREADY_HAS_ACTIVE_ORDER`, etc.).
   - Network / fetch failures (`Failed to fetch`, `Network request failed`, `AbortError`).
   - Fallback to `'unexpected'` generic kind.
3. **Centralized Arabic Dictionaries**: Per-feature Arabic dictionary modules (e.g., `ordersErrorMessages.ar.ts`, `driversErrorMessages.ar.ts`, `authErrorMessages.ar.ts`, `sharedErrorMessages.ar.ts`) exporting typed lookup functions:
   ```typescript
   export function getOrderErrorMessage(kind: OrderErrorKind): string;
   ```
4. **Zero Raw Error Displays**: Presentation components call the dictionary lookup using the error's `kind` (or use a shared `getErrorMessage(error)` helper). In development mode (`__DEV__`), raw error details are logged to the console via `console.error('[ErrorDebug]', error)`.

### Rationale
- Keeps Domain and Application layers free of Supabase or database error concepts (Constitution Principle II).
- Strict separation of technical error classification (Infrastructure) from user-facing language presentation (Presentation).
- Enables future locale additions without altering domain types or business logic (Principle IX).

### Alternatives Considered
- *Full i18n framework (e.g. i18next)*: Rejected per Principle X (Practical MVP Simplicity) and Out of Scope section in `spec.md`. Key-value dictionary modules provide typed compile-time safety with zero bundle overhead.
- *Classifying errors directly in UI hooks/components*: Rejected because it leaks backend error codes and database implementation details into presentation components.

---

## 2. TanStack Query v5 Connectivity & Foreground Refetch

### Context & Problem
When users lose internet connectivity or background the app on mobile, TanStack Query queries can enter endless spinners or display stale data. Furthermore, mutations could stall or auto-retry in unpredictable ways.

### Decision
1. **Network Connectivity via `onlineManager`**:
   - Wire `onlineManager.setEventListener` in `src/shared/lib/queryClient.ts` using `expo-network` (`addNetworkStateListener`).
   - Treat network status as online when `isConnected === true` and `isInternetReachable !== false`.
   - When network restores, TanStack Query automatically resumes paused queries.
2. **Foreground Synchronization via `focusManager`**:
   - Wire `focusManager.setEventListener` in `src/shared/lib/queryClient.ts` using React Native's `AppState` (`active` vs `background`/`inactive`).
   - Configure QueryClient defaults:
     ```typescript
     defaultOptions: {
       queries: {
         retry: 2,
         staleTime: 30_000,
         gcTime: 5 * 60 * 1000,
         refetchOnWindowFocus: true, // FR-005
         refetchOnReconnect: true,
       },
       mutations: {
         retry: 0,
         networkMode: 'always', // FR-006: fail fast immediately while offline
       },
     }
     ```
3. **Explicit Offline State in Presentation**:
   - For data-fetching screens, detect offline emptiness via `fetchStatus === 'paused' && !data`.
   - Render an explicit offline message in Arabic with a manual retry button ("لا يتوفر اتصال بالإنترنت").
   - Cached data remains fully visible when offline (`data` present) with no blocking spinner.

### Rationale
- Standard recommended approach for TanStack Query on React Native.
- Setting mutations to `networkMode: 'always'` ensures user writes fail fast with clear feedback rather than pausing and silently executing minutes later in the background.

---

## 3. Realtime Channel Lifecycle & Reconnection Recovery

### Context & Problem
Supabase Realtime channels do not replay missed PostgreSQL CDC events when disconnected (e.g., during network drops or background sleep). If a customer's order status changes from `preparing` to `on_the_way` while disconnected, the screen stays stale even after reconnecting.

### Decision
1. **Observe Realtime Channel Status**:
   - In `SupabaseOrderRealtimeService` and `SupabaseDriverRealtimeService`, provide the status callback in `.subscribe((status, err) => { ... })`.
   - Track previous connection state. When transitioning from a non-subscribed state (`TIMED_OUT`, `CHANNEL_ERROR`, `CLOSED`) back to `SUBSCRIBED`, trigger cache invalidation:
     - For order status: `queryClient.invalidateQueries({ queryKey: ['order', orderId] })`.
     - For driver pool: `queryClient.invalidateQueries({ queryKey: ['driver', 'availableOrders'] })`.
     - For driver active order: `queryClient.invalidateQueries({ queryKey: ['driver', 'activeOrder'] })`.
2. **Channel Deduplication & Teardown**:
   - Retain unique channel naming (`${channelPrefix}-${id}-${++channelSeq}`).
   - In the returned `Unsubscribe` function, call `supabase.removeChannel(channel)` to prevent memory leaks and duplicate socket listeners.
3. **Encapsulation**:
   - Keep all channel status callbacks and Supabase socket types inside the Infrastructure layer. The Domain interfaces (`OrderRealtimeService`, `DriverRealtimeService`) remain pure.

---

## 4. Unknown Outcome on Network Failures & Safe Retries

### Context & Problem
When a customer confirms an order or a driver claims an order, the request might reach the database and commit, but the network connection drops before the HTTP response reaches the mobile app. Currently, the app treats this as a hard error, which prompts duplicate attempts or user panic.

### Decision
1. **Order Confirmation (`place_order`)**:
   - If `placeOrderMutation` fails due to a network error (`kind === 'network_error'`), the client does **not** say "Order failed".
   - The customer remains on `/checkout` with their cart and active `idempotencyKey` intact.
   - Show an Arabic alert dialog explaining:
     - Title: "تعذر التحقق من حالة الطلب" (Could not verify order status)
     - Message: "انقطع الاتصال بالإنترنت أثناء تأكيد الطلب. يمكنك إعادة المحاولة بأمان أو التحقق من قائمة طلباتك."
     - Actions:
       1. "إعادة المحاولة": Re-executes `placeOrderMutation` using the **same** persisted `idempotencyKey`. The backend RPC idempotently returns the existing order if created, or creates it if it never reached the DB.
       2. "عرض طلباتي": Navigates to `/(customer)/orders`. Invalidate `['orders']` query cache so the fresh order list is loaded.
2. **Driver Order Claim (`claim_order`)**:
   - If claim fails due to a network drop, driver retries.
   - If a retry returns PostgreSQL error `23505` ("Driver already has an active order"):
     - Refetch driver's active order (`['driver', 'activeOrder']`).
     - If active order `id === orderId`, treat as **success**: navigate to active order screen.
     - If active order is a **different** order, show Arabic alert: "لديك طلب نشط بالفعل قيد التنفيذ" with action "عرض الطلب النشط" navigating directly to `/(driver)/active-order`.
3. **Transitions & Cancellations (`cancel_order`, `advance_order_status`, `release_order`)**:
   - If a retry returns a state-conflict code (`ORDER_CANNOT_BE_CANCELLED`, `ORDER_STATUS_CHANGED`, `ORDER_NOT_ACTIVE_OR_NOT_ASSIGNED`), immediately refetch the authoritative state from the server.
   - Display the updated state peacefully rather than a disruptive error alert.

---

## 5. Root Error Boundary in Expo Router

### Context & Problem
An unhandled render crash in any component currently renders a blank white screen. Expo Router supports exporting an `ErrorBoundary` component from `_layout.tsx`, but if that boundary relies on providers (ThemeProvider, Redux, TanStack Query, custom fonts) that themselves crashed, the boundary will also crash.

### Decision
1. **Zero-Dependency Fallback Component**:
   - Implement `RootErrorBoundary` with pure React Native primitives (`View`, `Text`, `TouchableOpacity`, `ScrollView`, `StyleSheet`).
   - Use system fonts (no Tajawal dependency) and hardcoded safe contrast colors (dark background `#1A1915`, white text `#F6F4EE`, warning accent `#F5BD16`).
2. **Export from `src/app/_layout.tsx`**:
   - `export function ErrorBoundary(props: { error: Error; retry: () => Promise<void> | void })`
3. **Dual Arabic Recovery Actions**:
   - Primary: "إعادة المحاولة" (calls `props.retry()` to re-attempt component rendering).
   - Secondary: "العودة للرئيسية" (resets boundary error state and executes navigation to `/` via `router.replace('/')`).
4. **Dev Debugging Details**:
   - When `__DEV__` is true, render a collapsible/scrollable box displaying `error.name`, `error.message`, and `error.stack`. In production, render only the user-friendly Arabic text.

---

## 6. Cart Hydration at Startup Gating

### Context & Problem
`initializeCartPersistence()` in `src/shared/lib/store.ts` runs asynchronously in a `void` call inside `AppProviders.tsx`. When cold-starting directly into `/cart` or `/checkout`, the UI renders before AsyncStorage finishes reading, causing a visible flash of an empty cart.

### Decision
1. **Startup Gating Synchronization**:
   - Expose cart hydration promise/state from `store.ts` (`isCartHydrated: boolean` or `waitForCartHydration(): Promise<void>`).
   - In `src/app/_layout.tsx`, incorporate cart hydration readiness into `isAppReady`:
     ```typescript
     const isAppReady =
       safetyTimeoutElapsed ||
       (cartHydrated && (!isLoading || !!authError) && (fontsLoaded || !!fontError));
     ```
2. **Hydration Safety & Timeout**:
   - If AsyncStorage throws or hangs, timeout after 1,500ms and mark hydration as finished with an empty cart. The splash screen will never be permanently blocked.

---

## 7. Cart Price & Availability Revalidation Before Checkout

### Context & Problem
Cart snapshots preserve product prices from when items were added. If store prices change or items become unavailable before the customer completes checkout, the database will reject the order or charge current prices unexpectedly.

### Decision
1. **Revalidation Hook (`useCartRevalidation`)**:
   - When entering `/checkout`, invoke revalidation against `ProductRepository.getProductsByStore(storeId)` and `StoreRepository.getStoreById(storeId)`.
   - Leverage existing logic from `useReorder` to compare live prices and availability against cart items and add-ons.
2. **State & Blocking UI**:
   - If store is closed: show blocking message and prevent checkout.
   - If items unavailable: mark unavailable items with a single-tap "إزالة" (remove) action; disable confirmation button until resolved.
   - If prices changed: display a blocking bottom-sheet or modal detailing:
     - Item name, previous price, new price, difference.
     - Updated subtotal and total.
     - Primary action: "الموافقة والمتابعة" (Accept & Proceed): updates cart item prices in Redux and enables confirmation.
     - Secondary action: "العودة للسلة" (Back to Cart): dismisses and navigates back to `/cart`.
3. **Network Failure Graceful Degradation**:
   - If the revalidation query itself fails due to network, show a non-blocking Arabic notice ("تعذر التحقق من الأسعار حالياً") and allow the user to proceed; PostgreSQL RPC `place_order` acts as the final server-side authority.

---

## 8. Session Expiry & Supabase Auto-Refresh Wiring

### Context & Problem
Supabase token refresh can fail if the app is backgrounded or when the refresh token expires. The app needs clean transition without crashing or throwing multiple 42501 errors.

### Decision
1. **AppState Auto-Refresh**:
   - In `src/shared/lib/supabase.ts`, attach an `AppState` listener:
     ```typescript
     AppState.addEventListener('change', (state) => {
       if (state === 'active') {
         supabase.auth.startAutoRefresh();
       } else {
         supabase.auth.stopAutoRefresh();
       }
     });
     ```
2. **Session Expiry Detection & Graceful Sign-Out**:
   - Supabase `onAuthStateChange` emits `SIGNED_OUT` or `TOKEN_REFRESHED` failure.
   - When an authenticated session is invalidated, trigger an Arabic dialog:
     - Message: "انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى"
     - Options:
       1. "تسجيل الدخول": navigates to `/(auth)/login`.
       2. "متابعة كزائر": clears server cache and navigates to `/(customer)` in guest mode.
   - Ensure the sign-out sequence in `AuthContext` tolerates an already-dead session without throwing.

---

## Summary of Decisions

| Area | Decision | Primary Rationale |
|---|---|---|
| Error Mapping | Pure Infrastructure classifier + typed `kind` + Arabic dictionary | Enforces clean architecture; zero backend strings leak into UI |
| React Query | `onlineManager` (expo-network) + `focusManager` (AppState) | Automatic pause/resume and background-to-foreground refresh |
| Mutations | `mutations: { retry: 0, networkMode: 'always' }` | Fail fast with explicit user feedback on offline writes |
| Realtime | Status listener on channels; query invalidation on reconnect | Resilient state recovery without missing events |
| Unknown Write Outcome | Idempotency key preservation + dual-action retry dialog | Prevents duplicate orders and guides user safely |
| Error Boundary | Zero-dependency root fallback with dual recovery actions | Recovers gracefully from fatal render crashes without crashing itself |
| Cart Startup | Await cart hydration before dismissing splash screen | Eliminates empty-cart UI flash on cold starts |
| Cart Revalidation | Pre-checkout live catalog check with blocking price change sheet | Transparent pricing; customer explicit consent required |
| Auth Refresh | AppState-linked autoRefresh + safe sign-out fallback | Seamless backgrounding and user-friendly session expiry |
