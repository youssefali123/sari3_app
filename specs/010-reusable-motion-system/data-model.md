# Data Model: Reusable Motion & Interaction System (UI Phase 2)

**Feature**: `010-reusable-motion-system`
**Date**: 2026-09-29
**Status**: Completed
**Spec Reference**: [spec.md](./spec.md) | **Research Reference**: [research.md](./research.md)

---

## 1. Entity Definitions

### 1.1 `MotionPreset`

A named timing unit expressing interaction intent. The single source of truth for how motion *feels*.

| Preset | Duration source | Easing / spring | Intent |
|---|---|---|---|
| `fastInteraction` | `durationFast` (150ms) | standard | Presses, ticks, small toggles |
| `normalInteraction` | `durationNormal` (250ms) | standard | Entrances, sheet settles, dialog surfaces |
| `emphasizedInteraction` | `durationSlow` (400ms) | emphasized | Hero/status transitions deserving weight |
| `gentleEntrance` | `durationNormal` (250ms) | decelerated | List/item arrivals |
| `springInteractive` | spring (stiff, under-damped) | — | Finger-following motion (drags, press springs) |
| `springSnappy` | spring (high-stiffness, near-critical) | — | Quick settles (snaps, releases) |

**Rules**: Every duration flows through `safeMotionDuration()` (0 under reduced motion). Presets extend Phase 1 tokens additively; Phase 1 values are never edited. New presets require a regulating use case, not a screen request.

### 1.2 `MotionRecipe`

A reusable interaction pattern composing presets. Canonical catalog (one module each; configuration over duplication):

| Recipe | Module | Consumed by | FR |
|---|---|---|---|
| Button press | `recipes/buttonPress.ts` | `Button` (all 6 variants, in place) | FR-003, FR-004 |
| Card press | `recipes/cardPress.ts` | Store/Product/Order/driver cards (opt-in) | FR-005 |
| List entrance | `recipes/listEntrance.ts` | Virtualized cells via `useEntranceAnimation(index)` | FR-006, FR-007 |
| Screen transitions | `transitions/screen.ts` | Router `screenOptions` (fade/slide/sheet, RTL-mirrored) | FR-008, FR-009 |
| Favorite toggle | `recipes/favorite.ts` | Favorite stores/products | FR-010 |
| Add-to-cart feedback | `recipes/addToCart.ts` | Confirmed add-to-cart states only | FR-011 |
| Quantity control | `recipes/quantity.ts` | `QuantitySelector` (in place) | FR-012 |
| Bottom-sheet config | `config/bottomSheet.ts` | `Sari3BottomSheet` (in place) | FR-013 |
| Modal/dialog | `recipes/modal.ts` | Dialog surfaces | FR-014 |
| Skeleton primitives | `recipes/skeleton.ts` | Text/Image/Card/Item/ProductCard/StoreCard shapes | FR-015 |
| Loading-state transitions | `recipes/loadingStates.ts` | Opt-in idle/loading/success/error | FR-016 |
| Order-status transitions | `recipes/orderStatus.ts` | Confirmed statuses only (6 states) | FR-017, FR-018 |
| Success/error feedback | `recipes/feedback.ts` | Outcome messages (supporting role) | FR-019 |

**Rules**: Reusability rule (FR-023) — reuse, then extend by configuration, then (rarely) create. Recipes accept confirmed states and configuration; they never fetch, store, or mutate business state. Disabled/loading/opt-out branches are structural (short-circuit), not conventional.

### 1.3 `HapticPairing`

A static, auditable moment→trigger map (`config/hapticsMap.ts` over Phase 1 `utils/haptics.ts`):

| Moment | Trigger | Notes |
|---|---|---|
| Add to cart (success) | Medium | Confirmed state only |
| Favorite toggle | Light | Stores + products |
| Order placed | Success | Terminal confirmation |
| Important confirmation | Medium | Explicit confirmations |
| Significant status transition | Light | Major state arrivals |

**Rules**: Allow-list only — routine presses, scrolling, entrances, and decoration never fire haptics. All pairings are additionally gated by the reduced-motion flag. Haptics never carry meaning alone.

### 1.4 `ReducedMotionMode`

The system-wide calm rendering of every recipe, sourced **exclusively from the OS accessibility setting** (clarified; no in-app toggle), read live via Reanimated's built-in `useReducedMotion()` (`ReduceMotion.System` defaults; mid-session toggles settle without branching) and exposed via the motion layer's collision-free wrapper; `safeMotionDuration()`/`motionFor()` retain the distance/scale-shrinking rule.

| Normal behavior | Reduced-motion rendering |
|---|---|
| Movement / travel | Minimized or removed |
| Scale | Minimized or removed |
| Transitions | Opacity / state changes |
| Decorative animation | Off |
| Skeleton shimmer/pulse | Static shape |
| Haptic pairings | Off |
| Essential state feedback | Fully preserved |

---

## 2. State & Ownership

| State | Owner | Notes |
|---|---|---|
| Reduced-motion boolean | Live Reanimated `useReducedMotion()` value (OS-owned preference) | Not business state; read-only, follows mid-session OS toggles |
| Animation progress | Reanimated shared values (UI thread) | Never in Redux/Query/context |
| Recipe configuration | Consuming call site (props) | Static per usage; no global motion store |
| Gallery demo states | Gallery route (dev-only) | Never shipped |

No server state, no cart/order/favorite state, no persisted preferences originate here (Principle IV compliant).

---

## 3. Validation Rules (testable)

- VR-01: Same interaction, same response everywhere (SC-001 sampling).
- VR-02: Timing budgets — press start ≤100ms, entrances ≤500ms, transitions ≤400ms (SC-002).
- VR-03: No raw timing/spring constants in feature code for covered interactions (SC-003 search audit).
- VR-04: Zero banned imports in `motion/` — mechanically via lint rule (SC-004).
- VR-05: Reduced-motion calm equivalents for 100% of recipes with preserved feedback (SC-005).
- VR-06: RTL mirroring for 100% of directional motion (SC-006).
- VR-07: Dependency list contains no new animation/blur packages; no custom navigator (SC-007).
- VR-08: Non-opted screens pixel/behavior-identical to pre-Phase 2 (SC-008).
- VR-09: All 18 deliverables present, documented, consumable (SC-009 gallery review).
