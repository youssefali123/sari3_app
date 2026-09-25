Create the project constitution for Sari3, a React Native + Expo + TypeScript + Supabase delivery app with two roles (Customer, Driver).

Ratify the following non-negotiable principles:

1. Feature-First Structure (Screaming Architecture)
   The codebase root MUST be organized by business capability
   (orders, restaurants, cart, drivers, notifications...), never by
   technical layer (controllers, services, models). A developer should
   understand what the app does by reading folder names alone.

2. Lightweight Clean Architecture per Feature
   Where a feature has real business logic, separate:
   domain (entities + repository/service interfaces, pure TypeScript),
   application (use cases, hooks, state wiring),
   infrastructure (Supabase/Expo implementations),
   presentation (React Native UI).
   Domain and Application MUST NOT import Supabase, React Native,
   Expo, AsyncStorage, TanStack Query, Redux, or navigation libraries.
   Do NOT create all four layers for trivial or purely-orchestrating
   features (e.g. checkout) — only create the layers that add real value.

3. Dependency Direction Is Fixed
   Presentation → Application → Domain ← Infrastructure.
   Infrastructure implements Domain-owned interfaces; Domain never
   depends on Infrastructure.

4. State Ownership Is Never Duplicated
   TanStack Query owns ALL server state (restaurants, products, orders,
   favorites, promotions, coupons, addresses, driver data).
   Redux Toolkit owns ONLY client-local state (cart, local UI state).
   Realtime events update the TanStack Query cache directly
   (setQueryData/invalidateQueries) — never mirrored into a Redux slice.

5. The Server Is the Final Authority, Never the Client
   Client-side checks (role visibility, cart totals, coupon validity)
   are UX conveniences only. Final enforcement happens at the database:
   Row Level Security policies + Postgres functions. Prices, discounts,
   coupon validity, and order totals MUST be recomputed and validated
   server-side before an order is persisted.

6. Concurrency-Critical Writes Must Be Atomic at the Database Level
   Any operation where two actors could race for the same resource
   (e.g. two drivers accepting the same order) MUST be implemented as
   a single atomic conditional UPDATE or a SECURITY DEFINER Postgres
   function — never as a client-side read-then-write check.

7. Historical Records Are Immutable Snapshots
   Data referenced by a completed transaction (order items, applied
   add-ons, delivery address used) MUST be stored as a snapshot at
   creation time, not as a live foreign-key lookup — so edits to the
   source record (product price change, deleted address) never alter
   historical orders.

8. Realtime and Push Notifications Are Separate Concerns
   Realtime = live in-app updates while the app is open (Supabase
   Realtime). Push = out-of-app alerts (Expo push or equivalent).
   Both MUST be hidden behind Domain-owned service interfaces
   (e.g. OrderRealtimeService, NotificationService); use cases never
   reference Supabase Realtime or Expo Notifications directly.

9. Deferred Scope Must Not Require Future Rewrites
   Features explicitly out of MVP scope (live GPS tracking, online
   payments, Admin role) are excluded now, but every architectural
   decision must keep the door open for them as NEW features/
   infrastructure implementations, without breaking existing
   interfaces or restructuring existing features.

10. Practical MVP Simplicity Over Theoretical Purity
    Avoid unnecessary abstractions, empty folders, DI containers, or
    premature generalization (e.g. no polymorphic linkType/linkId
    patterns unless proven necessary). Code must remain understandable
    to a junior/mid-level developer.

Include a governance section: this constitution supersedes ad-hoc
decisions in specs/plans; amendments require an explicit version bump
and a stated reason.
