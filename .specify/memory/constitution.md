<!--
=== Sync Impact Report ===
Version change: 1.0.0 → 1.1.0
Modified principles:
  - Principle IV: State Ownership Is Never Duplicated
    → Appended scoped exception: Exception IV-A — Auth Session State
      (AuthContext), approved during feature 002-auth-and-onboarding.
Added sections: None (Exception IV-A is an amendment within Principle IV)
Removed sections: None
Follow-up TODOs: None
===========================
-->

# Sari3 Constitution

## Core Principles

### I. Feature-First Structure (Screaming Architecture)

The codebase root MUST be organized by business capability
(`orders/`, `restaurants/`, `cart/`, `drivers/`, `notifications/`, etc.),
never by technical layer (`controllers/`, `services/`, `models/`).
A developer MUST be able to understand what the app does by reading
folder names alone.

**Rationale**: Business-capability folders make features discoverable,
reduce merge conflicts across teams, and prevent cross-cutting
"god" directories that hide intent.

### II. Lightweight Clean Architecture per Feature

Where a feature has real business logic, separate it into:

- **Domain** — entities + repository/service interfaces (pure TypeScript).
- **Application** — use cases, hooks, state wiring.
- **Infrastructure** — Supabase / Expo implementations.
- **Presentation** — React Native UI.

Domain and Application layers MUST NOT import Supabase, React Native,
Expo, AsyncStorage, TanStack Query, Redux, or navigation libraries.

All four layers MUST NOT be created for trivial or purely-orchestrating
features (e.g., checkout). Create only the layers that add real value.

**Rationale**: Keeps business logic portable, testable without emulators,
and replaceable at the infrastructure boundary — while avoiding
over-engineering simple features.

### III. Dependency Direction Is Fixed

The allowed dependency flow is:

```
Presentation → Application → Domain ← Infrastructure
```

Infrastructure implements Domain-owned interfaces; Domain MUST
never depend on Infrastructure.

**Rationale**: A single, enforced direction prevents circular
dependencies and ensures the domain layer remains a stable contract.

### IV. State Ownership Is Never Duplicated

- **TanStack Query** owns ALL server state (restaurants, products,
  orders, favorites, promotions, coupons, addresses, driver data).
- **Redux Toolkit** owns ONLY client-local state (cart contents,
  transient UI flags).
- Realtime events MUST update the TanStack Query cache directly
  (`setQueryData` / `invalidateQueries`) — never mirrored into a
  Redux slice.

**Rationale**: A single source of truth per data kind eliminates
stale-data bugs and simplifies cache invalidation.

#### Exception IV-A — Auth Session State (Approved: feature 002-auth-and-onboarding)

Auth session state — the raw Supabase `Session` object (tokens, expiry,
refresh state) — is held in a dedicated `AuthContext`, **not** Redux.

**Reason**: The `Session` object is non-trivially serializable.
Storing it in Redux Toolkit would require constant suppression of
Redux's built-in serializability checks, which would defeat their
safety purpose.

**Scope**: This exception is strictly limited to the raw `Session`
object and the loading/error metadata needed to drive auth flows.
It does NOT extend to any derived business data.

**Boundary rule**: Derived, serializable values (`isAuthenticated`,
`userId`, `role`) that other features need for UI or routing decisions
MUST still be read exclusively through the auth feature's public hooks
(`useAuth` / `useRequireAuth`). These values MUST NEVER be duplicated
into Redux, AsyncStorage, or any other store.

**Compliance**: Code reviews MUST verify that:
1. Only `AuthContext` consumers use raw session data.
2. No auth-derived value is written into a Redux slice,
   AsyncStorage key, or a second React context.

### V. The Server Is the Final Authority, Never the Client

Client-side checks (role visibility, cart totals, coupon validity)
are UX conveniences only. Final enforcement happens at the database:
Row Level Security policies + Postgres functions.

Prices, discounts, coupon validity, and order totals MUST be
recomputed and validated server-side before an order is persisted.

**Rationale**: Client code can be tampered with or bypassed; only
the database can guarantee data integrity for financial operations.

### VI. Concurrency-Critical Writes Must Be Atomic at the Database Level

Any operation where two actors could race for the same resource
(e.g., two drivers accepting the same order) MUST be implemented as
a single atomic conditional `UPDATE` or a `SECURITY DEFINER` Postgres
function — never as a client-side read-then-write check.

**Rationale**: Network latency makes optimistic client locks
unreliable; only database-level atomicity prevents double-accept and
similar race conditions.

### VII. Historical Records Are Immutable Snapshots

Data referenced by a completed transaction (order items, applied
add-ons, delivery address used) MUST be stored as a snapshot at
creation time, not as a live foreign-key lookup.

Edits to the source record (product price change, deleted address)
MUST never alter historical orders.

**Rationale**: Financial and legal accuracy requires that past
records reflect reality at the time of the transaction.

### VIII. Realtime and Push Notifications Are Separate Concerns

- **Realtime** = live in-app updates while the app is open
  (Supabase Realtime).
- **Push** = out-of-app alerts (Expo Push Notifications or
  equivalent).

Both MUST be hidden behind Domain-owned service interfaces
(e.g., `OrderRealtimeService`, `NotificationService`). Use cases
MUST never reference Supabase Realtime or Expo Notifications
directly.

**Rationale**: Decoupling transport from intent allows swapping
providers (e.g., FCM, OneSignal) without touching business logic.

### IX. Deferred Scope Must Not Require Future Rewrites

Features explicitly out of MVP scope (live GPS tracking, online
payments, Admin role) are excluded now, but every architectural
decision MUST keep the door open for them as NEW features /
infrastructure implementations, without breaking existing interfaces
or restructuring existing features.

**Rationale**: Rearchitecting a shipped product is orders of magnitude
more expensive than designing extension points upfront.

### X. Practical MVP Simplicity Over Theoretical Purity

Avoid unnecessary abstractions, empty folders, DI containers, or
premature generalization (e.g., no polymorphic `linkType`/`linkId`
patterns unless proven necessary).

Code MUST remain understandable to a junior/mid-level developer.

**Rationale**: Complexity that does not serve a current requirement
is a liability — it slows onboarding, hides bugs, and increases
maintenance cost.

## Technology Stack

| Concern              | Technology                       |
| -------------------- | -------------------------------- |
| Framework            | React Native + Expo SDK 57       |
| Language             | TypeScript (strict mode)         |
| Routing              | Expo Router (file-based)         |
| Server State         | TanStack Query v5                |
| Client State         | Redux Toolkit                    |
| Backend / Auth / DB  | Supabase (Postgres, RLS, Auth)   |
| Realtime             | Supabase Realtime                |
| Push Notifications   | Expo Notifications               |
| Local Storage        | AsyncStorage                     |

All technology choices are binding. Substitutions require a
constitutional amendment.

## Development Workflow

- Every feature branch MUST comply with the principles above before
  merge.
- Spec Kit artifacts (`spec.md`, `plan.md`, `tasks.md`) MUST be
  reviewed for constitutional alignment during feature planning.
- Code reviews MUST verify that dependency direction (Principle III)
  and state ownership (Principle IV, including Exception IV-A) are
  not violated.
- Server-side enforcement (Principle V) MUST be demonstrated via
  RLS policy tests or Postgres function tests for any feature that
  handles pricing, authorization, or order mutations.

## Governance

This constitution supersedes all ad-hoc decisions made in specs,
plans, or task lists. In case of conflict, this document is
authoritative.

**Amendment procedure**:

1. Propose the change with a stated reason and affected principles.
2. Update `constitution.md` with the amendment.
3. Increment `CONSTITUTION_VERSION` per semantic versioning:
   - **MAJOR**: Backward-incompatible governance/principle removals
     or redefinitions.
   - **MINOR**: New principle/section added or materially expanded
     guidance.
   - **PATCH**: Clarifications, wording, typo fixes, non-semantic
     refinements.
4. Record the amendment date in `Last Amended`.

**Compliance review**: All Spec Kit commands (`/speckit-specify`,
`/speckit-plan`, `/speckit-tasks`, `/speckit-implement`) MUST read
and respect this constitution at runtime. Deviations MUST be flagged
and justified or corrected before proceeding.

**Version**: 1.1.0 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-09-19
