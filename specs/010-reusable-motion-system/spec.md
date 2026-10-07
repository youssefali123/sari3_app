# Feature Specification: Reusable Motion & Interaction System (UI Phase 2)

**Feature Branch**: `010-reusable-motion-system`

**Created**: 2026-09-29

**Status**: Draft

**Input**: User description: "create a specification for i want to create and all details in this file: @mds/ui-phase2.md"

## Clarifications

### Session 2026-09-29

- Q: Should Phase 2 acceptance enforce specific timing budgets (press feedback starts within 100ms, entrances complete within 500ms, transitions within 400ms)? → A: Yes — keep the budgets as acceptance gates per SC-002.
- Q: How should motion recipes be verified without migrating production screens? → A: A dev-only preview gallery route rendering every recipe and state (also serving as living documentation for Phase 3).
- Q: What controls reduced-motion mode: the OS accessibility setting, an in-app toggle, or both? → A: The OS accessibility setting only; no in-app toggle in Phase 2.

- Note (tasks amendments): the dev-only preview gallery is excluded from production navigation AND guarded by an early `if (!__DEV__) return null` (tasks T011) — a parenthesized Expo Router group still bundles without the guard. Reduced-motion plumbing uses Reanimated's live `useReducedMotion()` hook (tasks T006), which satisfies the mid-session edge case below.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Button Press Feedback (Priority: P1)

Anyone tapping any button in the app (customer, driver, or guest — primary, secondary, outlined, inverted, ghost, or destructive) feels the same subtle press-and-release response everywhere. A disabled button never plays the active press response, and a loading button transitions to its loading state instead of the press response.

**Why this priority**: Buttons are the highest-frequency interaction in the app. One shared press behavior eliminates the most visible source of motion inconsistency with a single recipe.

**Independent Test**: Can be tested independently by rendering each button variant in a preview harness, pressing and releasing each, and confirming identical press behavior across all variants — with no screen migration required.

**Acceptance Scenarios**:

1. **Given** any enabled button variant, **When** the user presses it, **Then** the same subtle compression feedback plays and reverses smoothly on release.
2. **Given** a disabled button, **When** the user presses it, **Then** no active press feedback plays.
3. **Given** a button entering a loading state, **When** the state changes, **Then** a short state transition plays instead of the press response.
4. **Given** the existing shared Button component, **When** Phase 2 is complete, **Then** it consumes the shared press recipe with no separate animated button component existing.

---

### User Story 2 - Lively Browse Lists (Priority: P1)

A customer scrolling restaurants, products, markets, orders, or notifications sees list items arrive with the same lightweight entrance (fade with subtle movement, optional gentle scale). Long lists stay smooth and never play heavy staggered cascades.

**Why this priority**: Browse lists are the core visual surfaces of the app. A single entrance recipe makes every list feel polished without per-screen animation code.

**Independent Test**: Can be tested independently by rendering sample lists of each type in a preview harness with short and very long item counts, confirming identical entrance behavior and smooth scrolling.

**Acceptance Scenarios**:

1. **Given** any supported list type, **When** items first appear, **Then** they play the same lightweight entrance (opacity with subtle translation).
2. **Given** a list with a large item count, **When** it renders and scrolls, **Then** scrolling remains smooth with no heavy stagger cascade.
3. **Given** a list screen that has not opted in, **When** it renders, **Then** its items appear with no entrance animation (opt-in only; nothing is forced).
4. **Given** entrance configuration (delay, duration, direction, intensity), **When** adjusted, **Then** the change applies through recipe configuration, not per-screen animation code.

---

### User Story 3 - Predictable Screen & Dialog Transitions (Priority: P1)

Moving between screens (including modal-like screens and dialogs) always uses a preset transition from a shared set — fade, subtle horizontal slide, subtle vertical slide, or scale/fade for layered content — and directional transitions mirror correctly when the app runs in Arabic (RTL). Dialogs fade their backdrop and settle with subtle scale/translation, never with bounce or drama.

**Why this priority**: Navigation is the skeleton of perceived quality. Consistent, RTL-correct transitions make the app feel coherent in both languages.

**Independent Test**: Can be tested independently by triggering each transition preset in both English (LTR) and Arabic (RTL) locales in a preview harness, confirming the preset set and RTL mirroring without changing navigation architecture.

**Acceptance Scenarios**:

1. **Given** a screen change, **When** the transition plays, **Then** it uses one of the shared presets (fade, subtle horizontal/vertical slide, or scale/fade for modal-like screens).
2. **Given** the app running in Arabic (RTL), **When** forward/back navigation animates, **Then** directions mirror correctly instead of reusing LTR assumptions.
3. **Given** a modal or dialog opening or dismissing, **When** it animates, **Then** the backdrop fades and the surface settles with subtle scale/translation and no bounce.
4. **Given** the existing navigation setup, **When** Phase 2 is complete, **Then** no custom navigation infrastructure exists for animation purposes.

---

### User Story 4 - Delightful Commerce Micro-Interactions (Priority: P2)

Tapping a favorite heart, adding an item to the cart, or changing a quantity gives immediate, subtle feedback — a gentle scale, an icon transition, and (only for meaningful moments) a light haptic tap. The animation never performs the business action itself; it only reacts to an already-confirmed UI state.

**Why this priority**: These micro-interactions confirm the actions users care about most (saving, buying). Centralizing them keeps every feature screen consistent.

**Independent Test**: Can be tested independently by triggering favorite toggle, add-to-cart success, and quantity increment/decrement states in a preview harness, confirming identical feedback each time.

**Acceptance Scenarios**:

1. **Given** a favorite toggle, **When** activated, **Then** immediate visual feedback plays (subtle scale with optional icon emphasis) identically for stores and products.
2. **Given** a successful add-to-cart action, **When** it completes, **Then** button/icon/quantity feedback plays with optional haptic confirmation.
3. **Given** a quantity increment or decrement, **When** the value changes, **Then** subtle feedback makes the change feel immediate with no excessive movement, via the shared QuantitySelector component.
4. **Given** the animation layer, **When** inspected, **Then** it contains no cart, favorite, or server-state update logic of any kind.

---

### User Story 5 - Gesture-Responsive Bottom Sheets (Priority: P2)

Opening, closing, snapping, and interacting with a bottom sheet feels consistent and stays responsive to the user's finger throughout, using the shared configuration over the existing bottom-sheet infrastructure with the Sari3 visual style unchanged.

**Why this priority**: Bottom sheets host critical flows (options, confirmations). Consistent, gesture-faithful motion keeps them trustworthy.

**Independent Test**: Can be tested independently by driving a sample sheet through open, close, snap, and drag gestures, confirming consistent motion and gesture responsiveness.

**Acceptance Scenarios**:

1. **Given** a bottom sheet, **When** it opens, closes, or snaps between points, **Then** it uses the shared motion configuration.
2. **Given** a user dragging a sheet, **When** the gesture is in progress, **Then** motion tracks the finger responsively.
3. **Given** any bottom sheet, **When** inspected, **Then** no blur, glassmorphism, or custom animation engine is present.

---

### User Story 6 - Calm Loading Experiences (Priority: P2)

While content loads, the app shows reusable skeleton shapes (text, image, card, list item, product card, store card) with a subtle shimmer or pulse, and transitions gently between idle, loading, success, and error states. Users who prefer reduced motion get a simple non-animated loading state.

**Why this priority**: Loading is the most common waiting experience. Shared skeletons make waits feel intentional and fast instead of broken.

**Independent Test**: Can be tested independently by rendering each skeleton shape and each loading-state transition in a preview harness, including with reduced motion enabled.

**Acceptance Scenarios**:

1. **Given** loading content of a supported shape, **When** it renders, **Then** a shared skeleton primitive (not a per-screen shimmer) is used.
2. **Given** reduced motion enabled, **When** loading content renders, **Then** a simple non-animated loading state appears instead of shimmer/pulse.
3. **Given** a feature screen, **When** it shows loading feedback, **Then** it opts into a shared idle/loading/success/error transition (nothing animates by default).

---

### User Story 7 - Honest Order Status & Outcome Feedback (Priority: P3)

When an order's confirmed status changes (pending, accepted, preparing, out for delivery, delivered, cancelled), its indicator transitions gracefully — progress movement, checkmark appearance, subtle icon change. Success moments (order placed, address saved) and errors (validation failure, failed action) play restrained supporting motion alongside text, icon, and color — never as the message itself.

**Why this priority**: Status and outcome feedback builds trust. Tying motion strictly to confirmed states prevents the app from ever implying something that hasn't happened.

**Independent Test**: Can be tested independently by feeding confirmed status values and success/error events into the feedback recipes in a preview harness, confirming transitions without any live order flow.

**Acceptance Scenarios**:

1. **Given** a confirmed order status value, **When** it is displayed, **Then** the indicator transition (progress, checkmark, or icon change) reflects exactly that confirmed state.
2. **Given** a status change that the server has not confirmed, **When** observed, **Then** no status-change animation implies the new state.
3. **Given** a success or error message, **When** shown, **Then** text, icon, and semantic color carry the meaning, with motion only supporting.
4. **Given** a rapid state change or flash-prone effect, **When** reviewed, **Then** no aggressive flashing or visually harsh effect exists.

---

### User Story 8 - Motion That Respects People & Devices (Priority: P3)

Users who enable reduced motion get an app that calms down — less movement, shorter distances, opacity and state changes instead of motion, no decorative animation — while all essential feedback still reaches them. Touch targets stay stable, contrast is preserved, and lists and interactions stay performant on modest devices.

**Why this priority**: Accessibility and performance are release gates, not polish. This story makes them verifiable requirements of the motion system itself.

**Independent Test**: Can be tested independently by enabling reduced motion and exercising every recipe in the preview harness, plus auditing the motion layer for business-logic imports and render behavior.

**Acceptance Scenarios**:

1. **Given** reduced motion enabled, **When** any recipe would move, scale, or travel, **Then** movement is reduced or replaced with opacity/state changes and decorative animation is off.
2. **Given** any animated control, **When** it animates, **Then** its touch target stays stable and usable.
3. **Given** the motion layer source, **When** audited, **Then** it imports nothing from business-logic, data-fetching, or domain layers.
4. **Given** highly interactive animations, **When** profiled, **Then** they avoid unnecessary interface re-renders.

---

### Edge Cases

- **Reduced motion enabled mid-session**: Recipes already on screen settle into their calm equivalents without getting stuck in a half-played state.
- **State arrives mid-animation**: A new confirmed state (e.g., order status flips twice quickly, quantity tapped rapidly) cleanly supersedes the in-flight animation; animations never queue into a backlog.
- **Low-end device**: Long lists with entrance enabled and sheets under gesture stay smooth; heavy effects are absent by construction.
- **Haptics unsupported or disabled**: All interactions remain fully understandable with haptics silent or unavailable.
- **RTL layout**: Every directional recipe (screen slide, list entrance direction, swipe affordances) mirrors in Arabic; nothing assumes left-to-right.
- **Dark mode**: Skeleton shimmer, backdrops, and feedback colors remain legible against both themes.
- **Gesture conflicts**: Sheet drags, swipe actions, and scroll coexist without trapping the user's finger; destructive swipe actions require deliberate confirmation, never a stray flick.
- **Animation library absence**: If a motion dependency cannot load, screens still render their final states (motion enhances; it never gates content).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a centralized, reusable motion layer that feature screens consume for common interactions instead of each screen defining its own animation values and timing.
- **FR-002**: The system MUST centralize motion tokens (durations, easing curves, spring configurations, delays, scale/opacity/translation values) behind semantic presets (e.g., fast/normal/emphasized interaction, gentle entrance, interactive/snappy spring); feature screens MUST NOT hardcode animation constants for covered interactions.
- **FR-003**: The system MUST provide a reusable button press recipe (subtle compression on press, smooth release) consumed by the existing shared Button component across all six variants (primary, secondary, outlined, inverted, ghost, destructive), with no separate animated button component.
- **FR-004**: Disabled buttons MUST NOT play active press feedback, and buttons entering a loading state MUST play a short state transition instead of the press response.
- **FR-005**: The system MUST provide an opt-in reusable card press recipe (subtle feedback, smooth release, no exaggerated scaling or layout shift) usable for store, product, order, and driver order cards; non-interactive cards MUST NOT animate automatically.
- **FR-006**: The system MUST provide a reusable list-item entrance recipe (opacity with subtle translation, optional scale) with configurable delay, duration, direction, and intensity, compatible with virtualized list item rendering; heavy stagger cascades on long lists MUST NOT occur.
- **FR-007**: No list in the application MUST be forced to animate; entrance animation is strictly opt-in per screen (rollout decisions belong to Phase 3).
- **FR-008**: The system MUST provide reusable screen transition presets (fade, subtle horizontal slide, subtle vertical slide, scale/fade for modal-like screens) integrated with the existing navigation system; no custom navigation infrastructure MUST be created for animation.
- **FR-009**: All directional motion MUST respect RTL: forward/back navigation and directional entrances MUST mirror correctly in Arabic and MUST NOT assume left-to-right.
- **FR-010**: The system MUST provide a reusable favorite toggle interaction (immediate feedback, subtle scale, optional icon emphasis and haptic) shared by favorite stores and products, independent of favorite business logic.
- **FR-011**: The system MUST provide a reusable add-to-cart feedback recipe (button/icon/quantity feedback, optional haptic) that reacts only to already-confirmed UI states and MUST contain no cart, server-state, or store-update logic.
- **FR-012**: The system MUST provide a reusable quantity-control interaction (increment, decrement, selector) with subtle immediate feedback and no excessive movement, working through the shared QuantitySelector component.
- **FR-013**: The system MUST integrate motion configuration (open, close, snap, interaction) with the existing bottom-sheet infrastructure without creating a separate bottom-sheet animation engine, keeping motion responsive to gestures.
- **FR-014**: The system MUST provide reusable modal/dialog motion presets (fading backdrop, subtle scale/translation, smooth dismissal) with no bounce or dramatic transitions.
- **FR-015**: The system MUST provide reusable skeleton primitives (text, image, card, list item, product card, store card) with subtle shimmer/pulse motion, and a non-animated loading fallback when reduced motion is enabled.
- **FR-016**: The system MUST provide opt-in reusable transitions between idle, loading, success, and error states; loading states MUST NOT animate by default.
- **FR-017**: The system MUST provide reusable order-status transition patterns (indicator, progress, checkmark, icon) covering pending, accepted, preparing, out_for_delivery, delivered, and cancelled states.
- **FR-018**: Order-status motion MUST represent only already-confirmed server states and MUST NEVER imply a state change before confirmation.
- **FR-019**: Success and error feedback motion MUST support — never replace — text, icon, and semantic color messaging.
- **FR-020**: The system MUST pair selective haptic feedback with meaningful moments only (add to cart, favorite toggle, order placement, important confirmation, significant status transition); haptics MUST NOT fire for routine presses, scrolling, list animation, or decoration, and MUST NEVER be required to understand the UI.
- **FR-021**: The system MUST support reduced-motion preferences sourced exclusively from the OS accessibility setting (no in-app toggle in Phase 2): reduce movement, scale, and travel distance; prefer opacity/state changes; disable decorative animation; simplify skeleton loading — while keeping all essential state feedback available without motion.
- **FR-022**: Interactive animations MUST run on the interface thread where appropriate, avoid unnecessary re-renders, prefer transform and opacity properties, and MUST NOT animate large layout trees unnecessarily; long lists MUST remain performant.
- **FR-023**: Before creating a new animation, the reusability rule MUST hold: reuse an existing recipe, extend it by configuration if similar, and create a new recipe only for a meaningfully different interaction (no per-screen duplicate recipes for the same interaction).
- **FR-024**: The motion layer MUST depend only on presentation-level libraries; it MUST NOT import business-logic, server-state, data-fetching, or domain layers.
- **FR-025**: The system MUST NOT introduce a new animation library, Liquid Glass, blur effects, or glassmorphism; the visual language MUST remain the established theme system.
- **FR-026**: Native UI components remain optional: the motion system MUST NOT require them, and any native component animation MUST still respect the shared motion principles without a platform-specific animation system (absent a clear native requirement).
- **FR-027**: Gestures MUST feel predictable, respect RTL, avoid accidental destructive actions, and provide clear visual feedback; gestures MUST NOT be added where they provide no genuine UX value.
- **FR-028**: Phase 2 MUST NOT migrate screens wholesale, redesign screens, rewrite business logic or feature architecture, alter server or order/cart state logic, introduce new business rules, or animate every existing component; screen-by-screen rollout belongs to Phase 3.

### Key Entities

- **MotionPreset**: A named, semantic timing unit (duration, easing curve, spring configuration, delay) expressing interaction intent — e.g., fast interaction, gentle entrance, snappy spring. Single source of truth for how motion *feels*.
- **MotionRecipe**: A reusable interaction pattern composing presets into behavior — e.g., button press, card press, list entrance, screen transition, favorite toggle, add-to-cart feedback, quantity change, modal, skeleton, order-status transition, success/error feedback. Recipes accept configuration; screens never redefine raw animation values.
- **HapticPairing**: A declared coupling between a meaningful UI moment (order placed, favorite set, item added) and a restrained tactile pulse. Pairings are allow-listed; routine interactions are excluded by rule.
- **ReducedMotionMode**: A system-wide calm rendering of every recipe — movement minimized, opacity/state changes preferred, decorative motion off — with full information preserved.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The same interaction behaves identically everywhere — pressing any button variant, toggling any favorite, or changing any quantity produces the same response, verifiable across screens in 100% of sampled cases.
- **SC-002**: Press feedback begins within 100 milliseconds of touch, list entrances complete within 500 milliseconds, and screen transitions complete within 400 milliseconds on target devices.
- **SC-003**: Zero screens define their own raw animation timing or spring values for interactions covered by a recipe (verifiable by searching feature code for duplicated animation constants).
- **SC-004**: Zero imports from business-logic, server-state, data-fetching, or domain layers exist inside the motion layer (verifiable by static import audit).
- **SC-005**: With reduced motion enabled, 100% of recipes render calm equivalents with no decorative movement, and all essential state feedback remains perceivable.
- **SC-006**: In the Arabic locale, 100% of directional transitions mirror correctly (forward/back navigation, directional entrances), with zero LTR-assumed animations.
- **SC-007**: Zero new animation libraries, zero blur/glass packages, and zero custom navigation infrastructures are introduced (verifiable in the dependency list and navigation setup).
- **SC-008**: Screens not opting into Phase 2 recipes show zero visual or behavioral regressions versus before (Phase 3 scope is untouched).
- **SC-009**: All 18 deliverables (presets/tokens plus the 17 recipes, integrations, and modes in the Phase 2 deliverable list) exist, are documented for reuse, and are consumable by Phase 3.

## Assumptions

- **Phase 1 foundation present**: Theme/design tokens, Tajawal typography, light/dark themes, spacing, radii, shadows, motion tokens, reusable primitives (Button, QuantitySelector), RTL and accessibility foundations, plus installed animation dependencies (interface-thread animation engine, gesture handling, haptics, bottom-sheet infrastructure, virtualized lists, icon system) — all verified present before planning.
- **Recipe verification harness**: Recipes are verified in a dev-only preview gallery route rendering every recipe and state in isolation (doubling as living documentation for Phase 3 consumers), not by migrating production screens; no production screen migration occurs in Phase 2.
- **Token values at implementation**: Exact numerical durations, curves, spring values, and distances are selected during implementation from mobile UX best practices; the spec constrains only their semantics and consistency.
- **Haptic availability varies**: Haptics are enhancement-only; full comprehension never depends on them, and behavior on devices without haptic support is identical minus the pulse.
- **Server truth for status**: Order, cart, and favorite states remain owned by their existing business-logic and server layers; motion reacts exclusively to confirmed states.
- **Single-store cart and existing flows unchanged**: Checkout, conflict prompts, and fulfillment mechanics are untouched.
- **Arabic and English locales**: Both locales are supported for verification, including RTL mirroring checks.
- **Performance baseline**: Target devices include modest hardware; list and gesture performance is verified on representative devices, not only high-end ones.
