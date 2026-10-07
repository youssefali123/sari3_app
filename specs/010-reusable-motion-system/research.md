# Architectural Research: Reusable Motion & Interaction System (UI Phase 2)

**Feature**: `010-reusable-motion-system`
**Date**: 2026-09-29
**Status**: Completed
**Spec Reference**: [spec.md](./spec.md)

---

## Executive Summary

Phase 2 centralizes motion into `src/shared/ui/motion/` on top of verified Phase 1 infrastructure (Reanimated 4.5.1, gesture-handler root, `expo-haptics` wrapper, gorhom-backed `Sari3BottomSheet`, FlashList, `theme/motion.ts` tokens, `safeMotionDuration`/`prefersReducedMotion` helpers). This research resolves every technical unknown so implementation is mechanical: press/entrance drivers, reduced-motion plumbing, Router-native transitions with RTL mirroring, spring/token value strategy, sheet config, skeleton technique, haptic mapping, gallery verification, and boundary enforcement. No NEEDS CLARIFICATION items remain (spec clarification session 2026-09-29 settled budgets, gallery, and reduced-motion source).

---

## Research Decisions

### Decision 1: Press recipe drives the existing TouchableOpacity Button via shared-value scale

- **Context**: FR-003 requires the existing `Button` (TouchableOpacity-based, 6 variants + legacy alias, `disabled`/`loading` props) to consume the press recipe with no parallel animated component.
- **Decision**: A shared `usePressAnimation()` hook owns a Reanimated scale shared value driven by `onPressIn`/`onPressOut` (`withTiming`, `durationFast`, standard easing, target ~0.97), applied through an `Animated` style wrapper inside `Button`. The hook short-circuits to no-op when `disabled` or `loading` is true; `loading` renders the existing `ActivityIndicator` path with a short opacity transition instead. `cardPress` reuses the same hook with a gentler target (~0.99) and is opt-in per card.
- **Rationale**: Keeps the single `Button` API (zero call-site churn across 6 variants), stays on the UI thread, and makes disabled/loading branches structural rather than conventional.
- **Alternatives Considered**:
  - *Migrate Button to Pressable + `style` pressed callback*: equivalent visuals but forces prop/API churn on every call site for no motion benefit. Rejected.
  - *Separate `AnimatedButton` component*: explicitly forbidden by FR-003. Rejected.

### Decision 2: Reduced motion is read once at startup from the OS and fanned out as a boolean

- **Context**: Clarified source of truth is the OS accessibility setting only (no in-app toggle). Phase 1 `prefersReducedMotion()` is async and its docstring requires caching for synchronous consumers.
- **Decision** (amended per tasks T006 — supersedes the startup-cache design): Use Reanimated's built-in `useReducedMotion()` hook as the live OS-setting source, wrapped under a collision-free export name in `motion/hooks/useReducedMotion.ts` and wired via `AppProviders`. `withTiming`/`withSpring` keep `ReduceMotion.System` defaults so mid-session OS toggles settle into calm equivalents without getting stuck. `safeMotionDuration()` / `motionFor()` are retained for the distance/scale-shrinking rule Reanimated doesn't apply. Haptic pairings are additionally gated off under reduced motion.
- **Rationale**: The live hook responds to mid-session OS toggles with no per-component async reads; `ReduceMotion.System` defaults collapse durations on the UI thread; the distance/scale rule stays centralized in `safeMotionDuration()`; matches the clarified OS-only decision with no settings UI.
- **Alternatives Considered**:
  - *Per-component async reads*: bridge churn on every mount; races with first render. Rejected.
  - *Animated `ReduceMotion` config enum per animation*: finer control than needed; the boolean + zero-duration rule covers all 18 deliverables. Rejected.

### Decision 3: List entrance uses a capped index delay inside the cell renderer

- **Context**: FR-006/FR-007 demand a shared entrance compatible with FlashList cells, opt-in only, with no heavy stagger on long lists.
- **Decision**: `useEntranceAnimation(index)` computes `delay = min(index, CAP) * STEP` (CAP ≈ 8, STEP ≈ 30ms — final numbers at implementation within the 500ms SC-002 budget), opacity 0→1 with subtle vertical translation (direction configurable, RTL-aware default). Integration point is the cell renderer (`CellRendererComponent` wrapper or item wrapper component), never the list itself, so non-opted lists are untouched and virtualization/recycling behavior is unchanged.
- **Rationale**: Capping bounds total cascade time regardless of list length (a 1000-item list costs the same as a 9-item one); cell-level integration keeps FlashList recycling semantics intact.
- **Alternatives Considered**:
  - *Uncapped `index * delay` stagger*: violates the long-list smoothness requirement by construction. Rejected.
  - *AnimatePresence-style exit tracking*: no exit requirement exists; extra machinery for zero benefit. Rejected.

### Decision 4: Screen transitions are Expo Router `screenOptions` presets mirrored for RTL

- **Context**: FR-008/FR-009 require shared presets integrated with existing navigation — no custom navigator — with correct mirroring in Arabic.
- **Decision**: `transitions/screen.ts` exports named option sets mapping to Router Stack animation styles: `fade` → `animation: 'fade'`; horizontal slide → `slide_from_right` in LTR / `slide_from_left` in RTL (resolved via `I18nManager.isRTL`); vertical slide → `slide_from_bottom`; modal-like → `formSheet` (iOS) with fade fallback. Dialogs use the `modal.ts` recipe (backdrop fade + surface settle) inside the existing dialog component. Nothing wraps or replaces the Router.
- **Rationale**: Platform-native transitions stay on the UI thread and respect OS conventions; mirroring is a single locale conditional at preset resolution time.
- **Alternatives Considered**:
  - *Custom Reanimated screen-transition navigator*: forbidden by FR-008; reimplements platform behavior worse. Rejected.
  - *One universal fade*: simpler but drops the required slide/sheet vocabulary the spec mandates. Rejected.

### Decision 5: Semantic presets extend — never replace — Phase 1 tokens

- **Context**: FR-002 requires semantic presets; Phase 1 ships `durationFast 150 / Normal 250 / Slow 400` + 4 bezier curves, and SC-002 binds 100/500/400ms budgets.
- **Decision**: `presets.ts` maps `fastInteraction → 150ms/standard`, `normalInteraction → 250ms/standard`, `emphasizedInteraction → 400ms/emphasized`, `gentleEntrance → 250ms/decelerated`, plus `springInteractive` (stiff, slightly under-damped for finger-following) and `springSnappy` (high-stiffness, near-critically-damped for settles) using Reanimated 4.x `withSpring` damping/stiffness/mass (no legacy tension/friction units). All durations flow through `safeMotionDuration()`; spring travel distances shrink under reduced motion per the calm rule. Starting ranges (tuned in the gallery against SC-002): `springInteractive` stiffness 300–400 / damping 25–30 / mass 1; `springSnappy` stiffness 500–600 / damping 35–40 (near-critical); entrance travel 8–12px.
- **Rationale**: Additive extension preserves every Phase 1 consumer; semantic names let Phase 3 request intent ("emphasized") instead of milliseconds.
- **Alternatives Considered**:
  - *Hardcoded per-recipe numbers*: recreates the exact duplication problem Phase 2 exists to kill. Rejected.
  - *Editing Phase 1 token values*: risks regressions in shipped Phase 1 surfaces. Rejected (additive only).

### Decision 6: Bottom-sheet motion is a shared `animationConfigs` object, nothing more

- **Context**: FR-013 requires shared open/close/snap configuration over the existing gorhom-backed `Sari3BottomSheet` with gesture responsiveness and no blur/glass.
- **Decision**: `config/bottomSheet.ts` exports one `animationConfigs` (spring-based, snappy preset) consumed by `Sari3BottomSheet` via prop passthrough; drag physics stay 100% gorhom (already gesture-driven). No custom sheet engine, no backdrop component changes, no visual-token changes.
- **Rationale**: Gorhom already owns gesture physics; the only inconsistency risk was per-sheet config drift, which one shared object eliminates.
- **Alternatives Considered**:
  - *Custom Reanimated sheet*: massive scope for zero visual gain; forbidden by FR-013. Rejected.

### Decision 7: Skeletons use opacity-pulse primitives, not gradient shimmer

- **Context**: FR-015 requires shimmer/pulse primitives for 6 shapes plus a static fallback, all lightweight.
- **Decision**: Skeleton primitives are themed shape views (`SkeletonText/Image/Card/Item/ProductCard/StoreCard`) driven by one `useSkeletonAnimation()` hook: a repeating opacity pulse (`withRepeat(withTiming)`, ~1200ms) by default, with an optional translating highlight band (overflow-hidden, transform-only) for hero surfaces. Under reduced motion the hook returns the static shape. No gradient library is introduced.
- **Rationale**: Opacity pulses are the cheapest possible animation (no overdraw gradients, no extra deps); one hook guarantees all shapes pulse identically; static fallback is free via zero-duration collapsing.
- **Alternatives Considered**:
  - *`expo-linear-gradient` shimmer sweep*: adds a dependency and GPU overdraw for a loading state — contradicts the lightweight + no-new-deps rules. Rejected.

### Decision 8: Haptic pairings are a static moment→trigger map over the existing wrapper

- **Context**: FR-020 allow-lists meaningful moments and bans routine/decorative haptics; Phase 1 ships `triggerLight/Medium/Success` (all failure-swallowing).
- **Decision**: `config/hapticsMap.ts` maps moments → triggers: add-to-cart success → Medium; favorite toggle → Light; order placed → Success; important confirmation → Medium; significant status transition → Light. Recipes call the map (also gated by the reduced-motion flag per D2). No new haptic styles, no haptics in press/scroll/entrance paths.
- **Rationale**: A static map makes the allow-list auditable in one file and keeps `expo-haptics` swappable behind the Phase 1 wrapper.
- **Alternatives Considered**:
  - *Per-screen ad-hoc `Haptics.*` calls*: exactly the drift FR-020 exists to prevent. Rejected.

### Decision 9: The import boundary is enforced by lint, not convention

- **Context**: FR-024 + SC-004 require zero business/data-layer imports in motion code — a rule reviewers cannot reliably eyeball.
- **Decision**: Add a `no-restricted-imports` ESLint rule scoped to `src/shared/ui/motion/**` denying `@/features/*`, `@/shared/api/*` (or equivalent data paths), `react-redux`, `@tanstack/*`, and `expo-router`. `npx tsc --noEmit` + `npm run lint` in the validation pass therefore prove SC-004 mechanically.
- **Rationale**: Turns a review burden into a CI-verifiable gate; colocated with the existing `npm run lint` workflow.
- **Alternatives Considered**:
  - *Code-review-only enforcement*: drifts within weeks on a shared layer every feature touches. Rejected.

### Decision 10: Verification is the gallery; gestures add no new recipes

- **Context**: Clarified verification method is a dev-only gallery; §18 of the source allows future gesture use but demands real UX value.
- **Decision**: `app/(dev)/motion-gallery.tsx` (dev-only route, excluded from production navigation) renders every recipe × state × locale direction, with a reduced-motion readout reflecting the OS setting (no override control, per clarification). No new gesture recipes ship in Phase 2 — sheet drag (free via gorhom) and press handling cover the required surface; swipe/dismiss recipes are explicitly Phase 3 candidates.
- **Rationale**: One observable surface proves all 18 deliverables without touching production screens; scoping gestures out protects the Phase 2/3 boundary.
- **Alternatives Considered**:
  - *Unit tests as primary proof*: kept as supplement, but motion feel/RTL/stagger cannot be asserted from JS tests. Rejected as sole method.
  - *Pilot-screen rollout*: violates the no-migration rule (FR-028). Rejected.

---

## Conclusion & Readiness

All unknowns resolved with zero NEEDS CLARIFICATION markers. The design satisfies all 28 FRs, the 3 recorded clarifications, and all constitutional gates. Proceed to Phase 1: Design & Contracts.
