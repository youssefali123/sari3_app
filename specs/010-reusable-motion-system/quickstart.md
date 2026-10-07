# Quickstart Validation Guide: Reusable Motion & Interaction System (UI Phase 2)

**Feature**: `010-reusable-motion-system`
**Date**: 2026-09-29
**Spec Reference**: [spec.md](./spec.md) | **Contracts**: [motion-api.md](./contracts/motion-api.md) | **Data Model**: [data-model.md](./data-model.md)

---

## 1. Prerequisites & Environment Setup

```bash
# 1. Install dependencies (no new animation packages expected afterward)
npm install

# 2. Verify static gates (import boundary + types)
npx tsc --noEmit
npm run lint

# 3. Launch the app and open the dev-only gallery
npx expo start
# → navigate to the motion gallery route (dev only, not in production nav)
```

### 1.1 Test Setup

1. **Locales**: device/app language in English (LTR) and Arabic (RTL) — every scenario runs in both.
2. **Reduced motion**: OS accessibility setting OFF, then ON — every scenario runs in both modes.
3. **Gallery**: all recipe demos reachable without touching production screens.

---

## 2. End-to-End Validation Scenarios

### Scenario 1: Press consistency (US1 — MVP)

**Goal**: One press behavior across all button variants; disabled/loading branches correct.

1. Open the gallery button wall (6 variants + disabled + loading).
2. Press and release each enabled variant — confirm identical compression and release.
3. Press the disabled button — confirm zero active feedback.
4. Trigger the loading button — confirm short state transition, no press response.
5. **Expected**: Timing — feedback starts ≤100ms (SC-002). No `AnimatedButton` component exists.

### Scenario 2: Lists stay smooth (US2)

**Goal**: Shared entrance, capped stagger, opt-in only.

1. Open short-list and 1000-item demos — confirm identical entrance language.
2. Scroll the long list — confirm smooth scrolling, no cascade pileup (entrance budget ≤500ms).
3. Confirm a non-opted production list renders exactly as before (SC-008 spot check).

### Scenario 3: Navigation presets + RTL (US3)

**Goal**: Preset transitions with correct mirroring; calm dialogs.

1. Trigger fade / horizontal slide / vertical slide / sheet presets in English — confirm mapping.
2. Switch to Arabic — confirm forward/back slides mirror (no LTR assumptions).
3. Open/dismiss a dialog — confirm backdrop fade + subtle settle, no bounce.
4. Confirm no custom navigator was added.

### Scenario 4: Commerce micro-interactions (US4)

**Goal**: Favorite/cart/quantity feedback without business logic.

1. Toggle favorite (store + product) — confirm identical pop; favorite state itself unchanged by animation code.
2. Fire add-to-cart success — confirm feedback + single haptic pulse.
3. Increment/decrement quantity rapidly — confirm immediate ticks, no animation backlog.
4. Audit: motion layer contains no cart/favorite/server writes.

### Scenario 5: Sheets, skeletons, states (US5 + US6)

**Goal**: Gesture-faithful sheets; shared skeletons; opt-in state transitions.

1. Open/close/snap/drag the demo sheet — confirm shared config feel and finger tracking; confirm zero blur/glass.
2. Render all 6 skeleton shapes — confirm one shared shimmer language; enable reduced motion — confirm static shapes.
3. Cycle idle→loading→success→error — confirm subtle opt-in transitions.

### Scenario 6: Status honesty + calm mode (US7 + US8)

**Goal**: Confirmed-state-only status motion; full reduced-motion coverage; guardrails green.

1. Feed each of the 6 confirmed order statuses — confirm correct indicator transition; feed an unconfirmed change — confirm nothing implies it.
2. Fire success + error outcomes — confirm text/icon/color carry meaning, motion supports.
3. Enable OS reduced motion — walk the whole gallery: movement minimized, decorative motion off, feedback perceivable, haptics silent.
4. Run `npm run lint` (boundary rule) and `npx tsc --noEmit` — both green; dependency list shows no new animation/blur packages.

---

## 3. Regression Checklist (maps to SC-001–SC-009)

- [ ] SC-001 sampled identical behavior across screens/variants
- [ ] SC-002 budgets met (100ms / 500ms / 400ms)
- [ ] SC-003 feature-code search shows no duplicated raw animation constants
- [ ] SC-004 lint boundary green
- [ ] SC-005 reduced-motion walkthrough complete
- [ ] SC-006 RTL mirroring verified
- [ ] SC-007 dependency/navigation audit clean
- [ ] SC-008 non-opted screens unchanged
- [ ] SC-009 all 18 deliverables present in gallery and documented
