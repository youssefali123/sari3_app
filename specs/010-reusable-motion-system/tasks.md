# Tasks: Reusable Motion & Interaction System (UI Phase 2)

**Input**: Design documents from `specs/010-reusable-motion-system/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/
**Tests**: No automated test tasks — the spec mandates verification via the dev-only preview gallery route plus `npx tsc --noEmit`, `npm run lint`, and static audits (per research D10 and quickstart.md). Gallery sections per story serve as the independent test harness.
**Organization**: Tasks grouped by user story; each story is independently implementable and verifiable in its gallery section with zero production screen migration (FR-028).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in every description

## Path Conventions

- **Mobile (Expo SDK 57)**: `src/shared/ui/motion/` (new motion layer), `src/shared/ui/theme/`, `src/shared/ui/components/`, `src/app/(dev)/` (dev-only gallery)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline audit and motion-layer scaffolding

- [x] T001 Audit dependency list in package.json confirming reanimated 4.5.1, gesture-handler, expo-haptics, gorhom bottom-sheet, FlashList present and zero new animation/blur/glass packages added
- [x] T002 Create motion layer folder scaffold under src/shared/ui/motion/ (presets.ts, index.ts, recipes/, transitions/, hooks/, config/)
- [x] T003 [P] Verify Reanimated + GestureHandlerRootView wiring at app root in src/app/_layout.tsx and confirm Sari3BottomSheet gesture baseline in src/shared/ui/components/Sari3BottomSheet.tsx

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Semantic presets, reduced-motion plumbing, shared drivers, barrel, lint boundary, gallery shell — MUST complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create semantic presets in src/shared/ui/motion/presets.ts (fastInteraction→150ms/standard, normalInteraction→250ms/standard, emphasizedInteraction→400ms/emphasized, gentleEntrance→250ms/decelerated, springInteractive stiff under-damped, springSnappy high-stiffness near-critical via withSpring damping/stiffness/mass (starting ranges, tune in gallery vs SC-002: interactive stiffness 300–400 / damping 25–30 / mass 1; snappy stiffness 500–600 / damping 35–40; entrance travel 8–12px); every duration flows through safeMotionDuration())
- [x] T005 [P] Extend src/shared/ui/theme/motion.ts with spring configs only (additive; existing duration/easing token values untouched per FR-002)
- [x] T006 Create reduced-motion source in src/shared/ui/motion/hooks/useReducedMotion.ts wrapping Reanimated's built-in useReducedMotion() under a collision-free export name (live OS setting; withTiming/withSpring keep ReduceMotion.System defaults so mid-session OS toggles settle without getting stuck; supersedes research D2 startup-cache decision) wired via src/providers/AppProviders.tsx (OS setting only, no in-app toggle, no persistence; keep safeMotionDuration()/motionFor() distance/scale-shrinking rule in src/shared/ui/utils/motion.ts)
- [x] T007 Create shared press driver in src/shared/ui/motion/hooks/usePressAnimation.ts (Reanimated scale shared value, withTiming, onPressIn/onPressOut, structural disabled/loading short-circuit)
- [x] T008 [P] Create cell entrance driver in src/shared/ui/motion/hooks/useEntranceAnimation.ts (delay = min(index,8)*30ms within 500ms budget, opacity 0→1 + subtle translation, RTL-aware direction default; per-item already-played guard keyed by item id — not index — so recycled FlashList cells never replay entrance on scroll; travel ~8–12px starting range per T004)
- [x] T009 Create public barrel in src/shared/ui/motion/index.ts exporting presets, all hooks, all recipes, screenTransitions, bottomSheetAnimationConfigs, hapticPairings per contracts/motion-api.md §1
- [x] T010 Add no-restricted-imports ESLint rule scoped to src/shared/ui/motion/** in eslint.config.js denying @/features/*, data-layer paths, react-redux, @tanstack/*, expo-router
- [x] T011 Scaffold dev-only gallery shell in src/app/(dev)/motion-gallery.tsx (early if (!__DEV__) return null guard so the route can never render in production builds, excluded from production navigation, src/app/(dev)/_layout.tsx registering the dev-only Stack group (following the existing (auth)/(customer)/(driver) group layout pattern; single motion-gallery screen, header shown) with a documented gallery deep-link access path, OS reduced-motion readout with no override control, per-recipe sections to be filled by story tasks)
- [x] T012 Run baseline npx tsc --noEmit and npm run lint to prove green foundation before story work

**Checkpoint**: Foundation ready — presets, reduced-motion plumbing, drivers, barrel, lint gate, gallery shell all green; story work can now begin

---

## Phase 3: User Story 1 — Consistent Button Press Feedback (Priority: P1) 🎯 MVP

**Goal**: One shared press-and-release response across all six Button variants; disabled plays nothing, loading plays a state transition; Button consumes the recipe in place

**Independent Test**: Render all 6 variants + disabled + loading in the gallery button wall; press/release each enabled variant and confirm identical compression/release; press disabled → zero feedback; trigger loading → short state transition. Feedback starts ≤100ms (SC-002). No AnimatedButton component exists (quickstart Scenario 1).

- [x] T013 [P] [US1] Create button press recipe in src/shared/ui/motion/recipes/buttonPress.ts (scale target ~0.97, durationFast/standard via presets, disabled/loading short-circuit branches, zero-duration under reduced motion, no business-logic imports)
- [x] T014 [P] [US1] Create opt-in card press recipe in src/shared/ui/motion/recipes/cardPress.ts (gentler target ~0.99 reusing usePressAnimation, no layout shift, non-interactive cards unaffected)
- [x] T015 [US1] Consume buttonPress via usePressAnimation in place in src/shared/ui/components/Button.tsx (props/API unchanged across primary/secondary/outlined/inverted/ghost/destructive + outline alias; loading keeps ActivityIndicator path with short opacity transition (~fastInteraction 150ms starting value) instead of press)
- [x] T016 [US1] Add gallery button-wall section in src/app/(dev)/motion-gallery.tsx (6 variants + disabled + loading, press/release harness)
- [x] T017 [US1] Validate press timing ≤100ms and run npx tsc --noEmit plus npm run lint for US1 files

**Checkpoint**: US1 fully functional and independently testable — every button variant shares one press behavior, verifiable without touching any screen

---

## Phase 4: User Story 2 — Lively Browse Lists (Priority: P1)

**Goal**: One lightweight opt-in list-item entrance shared by all browse lists; capped stagger keeps long lists smooth

**Independent Test**: Render short and 1000-item sample lists in gallery; confirm identical entrance language, smooth scrolling with no cascade pileup (entrance ≤500ms), and non-opted lists render exactly as before (quickstart Scenario 2).

- [x] T018 [US2] Create list entrance recipe in src/shared/ui/motion/recipes/listEntrance.ts (opacity 0→1 with subtle vertical translation and optional scale; configurable delay/duration/direction/intensity; delay = min(index,8)*30ms cap; FlashList CellRendererComponent-compatible; already-played guard keyed by item id (see T008) so scrolled-recycled cells don't re-fade; strictly opt-in per FR-007)
- [x] T019 [US2] Add gallery list section in src/app/(dev)/motion-gallery.tsx (short-list + 1000-item demos, scroll smoothness observable, non-opted baseline comparison)
- [x] T020 [US2] Validate entrance budget ≤500ms, capped stagger on long list, and zero forced animation on non-opted lists

**Checkpoint**: US1 + US2 both independently functional — buttons and lists share consistent motion with no per-screen animation code

---

## Phase 5: User Story 3 — Predictable Screen & Dialog Transitions (Priority: P1)

**Goal**: Shared screen-transition presets integrated with existing navigation plus calm modal/dialog motion, all RTL-mirrored

**Independent Test**: Trigger fade / horizontal slide / vertical slide / sheet presets in English then Arabic in gallery; confirm correct mapping and mirroring; open/dismiss dialog → backdrop fade + subtle settle, no bounce; confirm no custom navigator added (quickstart Scenario 3).

- [x] T021 [P] [US3] Create screen transition presets in src/shared/ui/motion/transitions/screen.ts (fade→animation fade; horizontal slide_from_right LTR / slide_from_left RTL via I18nManager.isRTL; vertical slide_from_bottom; modal-like formSheet iOS with fade fallback; Expo Router screenOptions mapping only)
- [x] T022 [P] [US3] Create modal/dialog recipe in src/shared/ui/motion/recipes/modal.ts (backdrop fade over normalInteraction ~250ms; surface scale 0.96→1 + translateY ~8→0px; smooth dismissal, no bounce/drama; starting values, tune in gallery)
- [x] T023 [US3] Add gallery transitions section in src/app/(dev)/motion-gallery.tsx (all presets × LTR/RTL, dialog open/dismiss demo)
- [x] T024 [US3] Verify transitions complete ≤400ms and confirm zero custom navigation infrastructure in navigation setup

**Checkpoint**: US1–US3 independently functional — press, entrance, and transition vocabulary all shared and RTL-correct

---

## Phase 6: User Story 4 — Delightful Commerce Micro-Interactions (Priority: P2)

**Goal**: Shared favorite-toggle, add-to-cart, and quantity feedback reacting only to confirmed states, with allow-listed haptics and zero business logic in the motion layer

**Independent Test**: Toggle favorite (store + product) → identical pop; fire add-to-cart success → feedback + single haptic pulse; rapid quantity increment/decrement → immediate ticks with no backlog; audit confirms no cart/favorite/server writes in motion code (quickstart Scenario 4).

- [x] T025 [P] [US4] Create favorite toggle recipe in src/shared/ui/motion/recipes/favorite.ts (immediate scale pop ~1.12–1.15 over fastInteraction ~150ms + optional icon emphasis, shared by stores + products, independent of favorite business logic; starting values, tune in gallery)
- [x] T026 [P] [US4] Create add-to-cart feedback recipe in src/shared/ui/motion/recipes/addToCart.ts (button/icon/quantity feedback reusing the press/favorite magnitude vocabulary on confirmed states only; zero cart/server-state/store-update logic per FR-011)
- [x] T027 [P] [US4] Create quantity control recipe in src/shared/ui/motion/recipes/quantity.ts (increment/decrement/selector ticks, tick scale ~1.08–1.12 over fastInteraction ~150ms, no excessive movement, supersedes in-flight animation on rapid taps; starting values, tune in gallery)
- [x] T028 [US4] Consume quantityTick in place in src/shared/ui/components/QuantitySelector.tsx (props/API unchanged)
- [x] T029 [US4] Create haptic allow-list map in src/shared/ui/motion/config/hapticsMap.ts over src/shared/ui/utils/haptics.ts (add-to-cart→Medium, favorite→Light, order placed→Success, important confirmation→Medium, significant status→Light; gated by reduced-motion flag; routine press/scroll/entrance/decoration excluded per FR-020)
- [x] T030 [US4] Add gallery commerce section in src/app/(dev)/motion-gallery.tsx (favorite store+product toggles, add-to-cart success, rapid quantity ticks)
- [x] T031 [US4] Audit US4 recipes for zero business-logic/data-layer imports (motion reacts, never writes)

**Checkpoint**: US1–US4 independently functional — commerce feedback centralized without touching cart/favorite/server logic

---

## Phase 7: User Story 5 — Gesture-Responsive Bottom Sheets (Priority: P2)

**Goal**: Shared open/close/snap/interaction configuration over existing gorhom infrastructure with Sari3 style unchanged and gestures staying finger-faithful

**Independent Test**: Drive demo sheet through open/close/snap/drag; confirm shared-config feel, responsive finger tracking, zero blur/glass/custom engine (quickstart Scenario 5a).

- [x] T032 [US5] Create shared sheet config in src/shared/ui/motion/config/bottomSheet.ts (single animationConfigs object, snappy spring preset; drag physics remain 100% gorhom)
- [x] T033 [US5] Consume bottomSheetAnimationConfigs via prop passthrough in src/shared/ui/components/Sari3BottomSheet.tsx (props/API/visual tokens unchanged; no backdrop, style, blur, or engine changes)
- [x] T034 [US5] Add gallery sheet section in src/app/(dev)/motion-gallery.tsx (open/close/snap/drag harness with gesture responsiveness observable)

**Checkpoint**: US1–US5 independently functional — sheets share one motion config with gestures untouched

---

## Phase 8: User Story 6 — Calm Loading Experiences (Priority: P2)

**Goal**: Shared skeleton primitives for six shapes with subtle shimmer/pulse plus opt-in idle/loading/success/error transitions and a static reduced-motion fallback

**Independent Test**: Render all 6 skeleton shapes → one shared shimmer language; enable OS reduced motion → static shapes; cycle idle→loading→success→error → subtle opt-in transitions; confirm nothing animates by default (quickstart Scenario 5b).

- [x] T035 [P] [US6] Create skeleton primitives in src/shared/ui/motion/recipes/skeleton.ts (SkeletonText/Image/Card/Item/ProductCard/StoreCard themed shapes + useSkeletonAnimation hook: repeating opacity pulse ~1200ms default, optional transform-only highlight band for hero surfaces, static shape under reduced motion, no gradient library)
- [x] T036 [P] [US6] Create loading-state transitions in src/shared/ui/motion/recipes/loadingStates.ts (opt-in idle/loading/success/error transitions; loading states never animate by default per FR-016)
- [x] T037 [US6] Add gallery skeleton + states section in src/app/(dev)/motion-gallery.tsx (6 shapes + state cycler, verified in both normal and reduced-motion modes, light + dark themes)

**Checkpoint**: US1–US6 independently functional — loading experiences shared, calm under reduced motion

---

## Phase 9: User Story 7 — Honest Order Status & Outcome Feedback (Priority: P3)

**Goal**: Confirmed-state-only order-status transitions plus restrained success/error supporting motion that never replaces text/icon/color

**Independent Test**: Feed each of 6 confirmed statuses → correct indicator transition; feed unconfirmed change → nothing implies it; fire success + error → meaning carried by text/icon/color with motion supporting; no harsh flashing (quickstart Scenario 6a).

- [x] T038 [P] [US7] Create order-status transitions in src/shared/ui/motion/recipes/orderStatus.ts (indicator/progress/checkmark/icon patterns for pending, accepted, preparing, out_for_delivery, delivered, cancelled; confirmed-states-only per FR-018; no aggressive flashing)
- [x] T039 [P] [US7] Create success/error feedback in src/shared/ui/motion/recipes/feedback.ts (supporting-only motion — scale ≤1.05 / opacity assist over fastInteraction — alongside text/icon/semantic color per FR-019; starting values, tune in gallery)
- [x] T040 [US7] Add gallery status + outcome section in src/app/(dev)/motion-gallery.tsx (6 confirmed statuses, unconfirmed-change negative check, rapid double-status-flip supersede check, success/error demos)

**Checkpoint**: All P1–P3 functional stories independently functional — status motion never implies unconfirmed state

---

## Phase 10: User Story 8 — Motion That Respects People & Devices (Priority: P3)

**Goal**: Full reduced-motion coverage, stable touch targets, presentation-only imports, and UI-thread performance across every recipe

**Independent Test**: Enable OS reduced motion and walk the entire gallery — movement minimized, decorative motion off, skeleton static, haptics silent (also verified with OS haptics disabled), all essential feedback perceivable; flip the OS setting mid-session and confirm in-flight recipes settle into calm equivalents without getting stuck; audit motion layer for banned imports and re-render behavior (quickstart Scenario 6b).

- [x] T041 [US8] Apply and verify calm equivalents for 100% of recipes across src/shared/ui/motion/ (movement/scale/travel minimized, opacity/state changes preferred, decorative animation off, skeleton static, haptic pairings off, essential state feedback preserved, mid-session OS-toggle settling verified)
- [x] T042 [US8] Verify interactive-animation performance rules across src/shared/ui/motion/ (UI-thread Reanimated shared values, transform/opacity only, no large layout-tree animation, no unnecessary re-renders, 44pt touch targets stable during animation)
- [x] T043 [US8] Run mechanical guardrails: npm run lint (motion import boundary in eslint.config.js), npx tsc --noEmit, and package.json audit proving zero new animation/blur packages, zero custom navigator, and no native-component animation dependency (@expo/ui stays optional per FR-026) (SC-004, SC-007)

**Checkpoint**: All 8 user stories independently functional with accessibility and performance gates green

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Gallery completion as Phase 3 documentation, full quickstart validation, cross-story audits

- [x] T044 Complete LTR + RTL locale coverage and consumer-documentation pass for all 18 deliverables in src/app/(dev)/motion-gallery.tsx (every recipe × state documented for Phase 3 consumers)
- [x] T045 Run full quickstart.md validation in specs/010-reusable-motion-system/quickstart.md (Scenarios 1–6 plus SC-001–SC-009 regression checklist, both locales × both reduced-motion modes × light/dark themes)
- [x] T046 [P] Run SC-003 audit searching feature code for duplicated raw animation timing/spring constants for recipe-covered interactions (zero-duplication gate, reusability rule FR-023)
- [x] T047 [P] Run SC-008 regression spot check confirming non-opted screens are pixel/behavior-identical to pre-Phase 2 (no wholesale migration per FR-028)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phases 3–10)**: All depend on Foundational completion
  - P1 stories (US1 → US2 → US3) first, in priority order
  - P2 stories (US4, US5, US6) next — mutually independent, parallelizable
  - P3 stories (US7, US8) last — US8's full-gallery audit needs all recipes present
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependencies on other stories
- **US2 (P1)**: After Foundational — uses useEntranceAnimation driver from Phase 2; otherwise independent of US1
- **US3 (P1)**: After Foundational — independent of US1/US2
- **US4 (P2)**: After Foundational — independent; hapticsMap also serves US7 moments (order placed, status transition) but US7 does not depend on US4's recipes
- **US5 (P2)**: After Foundational — independent
- **US6 (P2)**: After Foundational — independent
- **US7 (P3)**: After Foundational — independent of other stories' recipes
- **US8 (P3)**: After Foundational + all recipes (US1–US7) for the 100%-coverage walkthrough

### Within Each User Story

- Recipes (marked [P]) before integrations
- Integrations (Button, QuantitySelector, Sari3BottomSheet edits) after their recipes
- Gallery section after recipes so the harness demonstrates finished behavior
- Story validation task last before checkpoint

### Parallel Opportunities

- Phase 1: T003 can run alongside T001–T002
- Phase 2: T005 and T008 can run in parallel with the T004 → T006 → T007 chain; T009 after recipes/drivers exist; T010–T012 after code exists
- Phase 6: T025, T026, T027 in parallel (different files); T028 after T027; T029 in parallel with T025–T027
- Phase 8: T035, T036 in parallel; Phase 9: T038, T039 in parallel
- Across stories (once Foundational is done): US4/US5/US6 can proceed in parallel if staffed
- Polish: T046, T047 in parallel

---

## Parallel Example: User Story 4

```bash
# Launch all commerce recipes together (different files, no dependencies):
Task: "Create favorite toggle recipe in src/shared/ui/motion/recipes/favorite.ts"
Task: "Create add-to-cart feedback recipe in src/shared/ui/motion/recipes/addToCart.ts"
Task: "Create quantity control recipe in src/shared/ui/motion/recipes/quantity.ts"
Task: "Create haptic allow-list map in src/shared/ui/motion/config/hapticsMap.ts"

# Then integration (depends on quantity recipe):
Task: "Consume quantityTick in place in src/shared/ui/components/QuantitySelector.tsx"
```

## Parallel Example: Foundational

```bash
# Presets + theme springs + entrance driver are independent files:
Task: "Create semantic presets in src/shared/ui/motion/presets.ts"
Task: "Extend src/shared/ui/theme/motion.ts with spring configs only"
Task: "Create cell entrance driver in src/shared/ui/motion/hooks/useEntranceAnimation.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T012) — CRITICAL, blocks all stories
3. Complete Phase 3: US1 button press (T013–T017)
4. **STOP and VALIDATE**: Gallery button wall — identical press across variants, disabled/loading branches, ≤100ms start, lint + tsc green
5. Demo if ready — the highest-frequency interaction is now consistent app-wide

### Incremental Delivery

1. Setup + Foundational → motion kernel ready
2. Add US1 (press) → validate in gallery → MVP demo
3. Add US2 (entrance) → validate short + long lists → demo
4. Add US3 (transitions + modal) → validate LTR + RTL → demo
5. Add US4 (commerce + haptics) → US5 (sheets) → US6 (skeletons + states), each validated independently
6. Add US7 (status + outcomes) → US8 (calm-mode + guardrails) → full-gallery walkthrough
7. Polish → quickstart Scenarios 1–6 + SC-001–SC-009 all green → Phase 3 can consume

### Parallel Team Strategy

With multiple developers (after Setup + Foundational complete together):

- Developer A: US1 → US2 → US3 (P1 chain, MVP first)
- Developer B: US4 (commerce + haptics) + US7 (status + feedback, reuses haptic moments)
- Developer C: US5 (sheets) + US6 (skeletons + states)
- Converge: US8 walkthrough + Polish together (needs all recipes present)

---

## Notes

- [P] tasks = different files, no dependencies — safe for parallel execution
- [Story] label maps each task to its user story for traceability (US1–US8 ↔ spec.md stories)
- No automated test tasks: the spec binds verification to the dev-only gallery + tsc + lint + static audits; each story's gallery section IS its independent test
- Reduced motion is live-sourced from Reanimated's built-in useReducedMotion() (ReduceMotion.System defaults) with safeMotionDuration() / motionFor() retained for the distance/scale-shrinking rule Reanimated doesn't apply
- Scope trim option: US6 (skeletons) and US7 (order-status) build recipes with no Phase 2 consumers (Phase 3 opts in later) — deferrable if trimming; US1–US3 are the must-ship core every screen will feel
- SC-002 budget validation is gallery-observational by design (research D10); use slow-mo screen recording for borderline timing calls
- Reusability rule (FR-023): reuse → extend by configuration → create only for meaningfully different interactions; enforced by T046 audit
- Commit after each task or logical group; stop at any checkpoint to validate the story independently
- Avoid: per-screen duplicate recipes, raw millisecond literals for covered interactions, hardcoded physical directions, business-logic imports in motion/, production screen migration (Phase 3 scope)
