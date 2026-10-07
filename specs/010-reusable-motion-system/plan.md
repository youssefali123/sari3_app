# Implementation Plan: Reusable Motion & Interaction System (UI Phase 2)

**Branch**: `010-reusable-motion-system` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-reusable-motion-system/spec.md` (with 3 recorded clarifications: timing budgets as gates, dev-only preview gallery, OS-only reduced motion), Phase 1 foundation (`009-ui-design-foundation`), and project constitution (`.specify/memory/constitution.md` v1.1.0).

---

## Summary

Build a centralized, reusable motion layer under `src/shared/ui/motion/` that turns Phase 1's tokens and primitives into 18 consumable deliverables: semantic presets plus press, card, entrance, transition, favorite, add-to-cart, quantity, sheet, modal, skeleton, loading-state, order-status, and feedback recipes, with centralized haptics, OS-sourced reduced motion, and RTL-aware direction. Feature screens consume recipes; nothing migrates in Phase 2 (rollout is Phase 3). Verification runs in a dev-only preview gallery route, not on production screens.

Key implementation pillars:
1. **Presets over raw values**: Extend Phase 1 `theme/motion.ts` tokens with semantic presets (`fastInteraction`, `normalInteraction`, `emphasizedInteraction`, `gentleEntrance`, `springInteractive`, `springSnappy`) and wrap every duration with Phase 1 `safeMotionDuration()`.
2. **Recipe integration without new components**: The existing `Button` (press), `QuantitySelector` (quantity), and `Sari3BottomSheet` (sheet config) consume recipes in place; no parallel animated components.
3. **Expo Router-native transitions**: Screen/modal presets map to Stack `screenOptions` animation styles with RTL mirroring; no custom navigation infrastructure.
4. **Guardrails as code**: Import-boundary rule (motion imports presentation-only libraries), reduced-motion plumbing cached at startup, capped entrance delays for long FlashLists, and a gallery that doubles as Phase 3 documentation.

---

## Technical Context

**Language/Version**: TypeScript 5.7+ (strict mode `strict: true`), React 19.2.3, React Native 0.86.3

**Primary Dependencies**:
- `react-native-reanimated@4.5.1` (sole animation engine; UI-thread worklets)
- `react-native-gesture-handler@~2.32.0` (already wired at app root; sheet gestures come free)
- `expo-haptics@~57.0.3` via existing `src/shared/ui/utils/haptics.ts` (`triggerLight/Medium/Success`)
- `@gorhom/bottom-sheet@^5.2.14` via existing `Sari3BottomSheet.tsx` (shared `animationConfigs`)
- `@shopify/flash-list@2.0.2` (entrance must be cell-renderer compatible)
- Phase 1 theme tokens (`theme/motion.ts`: 150/250/400ms + 4 bezier curves) and `utils/motion.ts` (`prefersReducedMotion`, `safeMotionDuration`, `motionFor`)

**Storage**: N/A (motion holds no persisted state; the OS owns the reduced-motion preference, cached in memory at startup)

**Testing**: Dev-only preview gallery route (clarified) rendering every recipe/state in both locales, plus `npx tsc --noEmit`, `npm run lint`, and a static import-boundary audit of the motion layer

**Target Platform**: iOS + Android via Expo SDK 57 (Expo Go compatible; no native code)

**Project Type**: Mobile app shared-presentation layer (not a business feature)

**Performance Goals**: Press feedback starts within 100ms of touch; list entrances complete within 500ms; screen transitions complete within 400ms (SC-002, clarified as binding gates); 60fps scrolling on long lists; zero unnecessary re-renders from animation state

**Constraints**: UI-thread execution via Reanimated; transform/opacity only for interactive animation; no new animation libraries; no blur/glass; @expo/ui stays optional; no business-logic/data-layer imports in motion code; no production screen migration

**Scale/Scope**: 18 deliverables (1 preset extension + 17 recipes/integrations/modes); ~10 recipe modules + hooks + gallery; zero changes to feature architecture, navigation architecture, or server logic

---

## Constitution Check

*GATE: Evaluated against Constitution v1.1.0 principles — before Phase 0 and re-checked after Phase 1 design.*

| Principle | Requirement | Compliance Analysis | Status |
|---|---|---|---|
| **I. Feature-First Structure** | Code organized by business capability. | Motion is cross-cutting presentation infrastructure, not a business capability; it lives in the shared UI kernel (`src/shared/ui/motion/`) following the exact precedent Phase 1 established (`src/shared/ui/theme|components|utils`). No business feature is restructured. | **PASS** |
| **II. Lightweight Clean Architecture** | Layer split only where it adds value; Domain/Application stay framework-free. | The motion layer IS presentation infrastructure (Reanimated/RN are its native element, like theme). It defines no domain entities and owns no use cases; a single `motion/` folder with recipes/hooks/presets is the minimal valuable shape — no artificial domain/application split. | **PASS** |
| **III. Dependency Direction** | Presentation → Application → Domain ← Infrastructure. | Motion depends on nothing but presentation libraries; feature presentation code consumes motion recipes downward. No inversion, no cycles; the boundary is enforced by an import rule (research D9). | **PASS** |
| **IV. State Ownership** | TanStack = server state; Redux = client-local; Context = auth session. | Motion owns zero business state. The only state is the cached OS reduced-motion flag (device preference, memory-only, read at startup) — not server data, not cart, not session. Animation progress lives in Reanimated shared values (UI thread), never in Redux/Query. | **PASS** |
| **V. Server Is Final Authority** | Enforcement in Postgres/RLS; client checks are UX only. | Order-status, cart, and favorite animations react exclusively to already-confirmed states (FR-018/FR-011/FR-010); the motion layer cannot write orders, cart, or favorites (import ban makes this structural, not just conventional). | **PASS** |
| **VI. Atomic Concurrency Writes** | Races resolved atomically at the database. | No writes of any kind originate from motion code; supersede-on-new-state is a UI-thread concern only. | **PASS** |
| **VII. Historical Records Immutable** | Snapshots, no deletions. | Untouched — motion reads display values only. | **PASS** |
| **VIII. Realtime & Push Separate** | Transports hidden behind domain services. | Untouched — no realtime/push code in motion. | **PASS** |
| **IX. Deferred Scope Extensible** | No rewrites required for planned futures. | Phase 3 consumes recipes as-is; gesture/swipe recipes can extend the layer later without touching existing recipes. | **PASS** |
| **X. MVP Simplicity** | No premature abstraction; junior-readable. | Recipes + presets + hooks only; zero new dependencies; exact recipe catalog fixed at 18 deliverables. | **PASS** |

**Gate Result**: ✅ **ALL CONSTITUTIONAL GATES PASS** (re-confirmed post-Phase 1: no new violations introduced by research/design).

---

## Project Structure

### Documentation (this feature)

```text
specs/010-reusable-motion-system/
├── spec.md                  # Feature specification (clarified 2026-09-29)
├── research.md              # Phase 0 architectural research & decisions
├── data-model.md            # Phase 1 recipe/preset catalog and rules
├── quickstart.md            # Phase 1 gallery-driven validation scenarios
├── contracts/
│   └── motion-api.md        # Recipe/hook API + consumer obligations
└── plan.md                  # This implementation plan
```

### Source Code Changes & Structure

```text
src/
├── shared/
│   └── ui/
│       ├── motion/                          # NEW — Phase 2 motion layer
│       │   ├── presets.ts                   # Semantic presets over theme/motion.ts tokens
│       │   ├── index.ts                     # Public barrel (recipes, hooks, reduced-motion)
│       │   ├── recipes/
│       │   │   ├── buttonPress.ts           # Press/release; disabled/loading branches
│       │   │   ├── cardPress.ts             # Opt-in subtle card feedback
│       │   │   ├── listEntrance.ts          # Capped-delay entrance for virtualized cells
│       │   │   ├── favorite.ts              # Toggle pop + optional emphasis
│       │   │   ├── addToCart.ts             # Success-state feedback (no cart logic)
│       │   │   ├── quantity.ts              # Increment/decrement/selector ticks
│       │   │   ├── modal.ts                 # Backdrop fade + surface settle
│       │   │   ├── skeleton.ts              # Shimmer/pulse primitives + static fallback
│       │   │   ├── loadingStates.ts         # idle/loading/success/error transitions
│       │   │   ├── orderStatus.ts           # Confirmed-state indicator transitions
│       │   │   └── feedback.ts              # Success/error supporting motion
│       │   ├── transitions/
│       │   │   └── screen.ts                # Router animation presets, RTL-mirrored
│       │   ├── hooks/
│       │   │   ├── useReducedMotion.ts      # Cached OS setting (startup-read)
│       │   │   ├── usePressAnimation.ts     # Shared press driver (buttons, cards)
│       │   │   └── useEntranceAnimation.ts  # Cell entrance driver
│       │   └── config/
│       │       ├── bottomSheet.ts           # Shared gorhom animationConfigs
│       │       └── hapticsMap.ts            # Moment → triggerLight/Medium/Success map
│       ├── theme/
│       │   └── motion.ts                    # EXTEND — spring configs (additive only)
│       ├── components/
│       │   ├── Button.tsx                   # EDIT — consume buttonPress in place
│       │   ├── QuantitySelector.tsx         # EDIT — consume quantity recipe in place
│       │   └── Sari3BottomSheet.tsx         # EDIT — consume shared sheet config
│       └── utils/
│           └── haptics.ts                   # REUSE as-is (no changes)
└── app/
    └── (dev)/
        └── motion-gallery.tsx               # NEW — dev-only preview gallery route
```

**Structure Decision**: Single-project mobile layout (template Options 2/3 deleted as inapplicable). The motion layer extends the Phase 1 shared-UI kernel in place; the only app-surface addition is the dev-only gallery route. No feature folder is touched except in-place recipe consumption by three existing shared components.

---

## Complexity Tracking

*No constitutional violations identified. All gates pass unconditionally — this section is intentionally empty.*
