# Feature Specification: UI Design System & Foundation (Phase 1)

**Feature Branch**: `009-ui-design-foundation`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Establish a production-quality, reusable Sari3 UI foundation — centralized design tokens, typography (Tajawal), color system with light/dark themes, spacing, radii, elevation, motion tokens, reusable UI primitives (Button variants, Card, Text, Input, etc.), RTL-first support, accessibility foundations, and required UI libraries (Reanimated, Gesture Handler, Bottom Sheet, Haptics, FlashList, icon system). Phase 1 only — no screen redesigns, no animation recipes, no business logic changes."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Centralized Theme System (Priority: P1)

As a developer building or maintaining Sari3 screens, I want a single centralized theme system that exposes color, typography, spacing, radius, elevation, and motion tokens so that I never need to hardcode visual values or duplicate styling definitions.

**Why this priority**: Every other deliverable in this feature (components, dark mode, RTL) depends on having tokens defined first. Without this, nothing else can consume a consistent visual language.

**Independent Test**: Import a theme token (e.g., a color or spacing value) in any screen file and confirm it resolves correctly. Verify that changing the token value in the theme file propagates to every consumer — no orphaned hardcoded values remain in the shared UI layer.

**Acceptance Scenarios**:

1. **Given** a developer imports a color token from the theme, **When** the token value is changed in the theme source file, **Then** every component consuming that token reflects the change without editing individual files.
2. **Given** the theme system is loaded, **When** a developer inspects the exported tokens, **Then** semantic color tokens (e.g., `primary`, `background`, `textPrimary`, `error`, `disabled`), typography variants (e.g., `headingLarge`, `bodyMedium`, `price`, `button`), spacing scale, radius scale, elevation scale, and motion tokens are all present and non-empty.
3. **Given** a component uses the primary color (#FFB800) as a background, **When** white text is placed on it, **Then** contrast is verified or a darker shade from the primary scale is used for filled-background scenarios to meet readability standards.

---

### User Story 2 — Light and Dark Theme Architecture (Priority: P1)

As a user, I want the app to support both light and dark modes so that I can use the app comfortably in any lighting condition. As a developer, I want the dark mode architecture established now so that future screen migrations do not require a rewrite.

**Why this priority**: If the theme architecture does not support dual themes from the start, retrofitting dark mode later would require rewriting the entire token and component layer — violating the constitution's deferred-scope principle (IX).

**Independent Test**: Toggle the theme mode programmatically (or via a provider) and confirm that shared UI components render with the correct light or dark palette. Existing screens are NOT required to support dark mode yet — only the shared UI layer and its primitives.

**Acceptance Scenarios**:

1. **Given** the theme is set to light mode, **When** a shared UI component renders, **Then** it uses the light theme's semantic tokens (e.g., light background, dark text).
2. **Given** the theme is set to dark mode, **When** a shared UI component renders, **Then** it uses the dark theme's semantic tokens (e.g., dark background, light text) — not a simple color inversion.
3. **Given** the dark theme is active, **When** inspecting the primary brand color, **Then** the Sari3 primary identity (#FFB800 or a tuned variant) remains recognizable.

---

### User Story 3 — Tajawal Typography System (Priority: P1)

As a user, I want the app to render text in the Tajawal typeface — supporting Arabic, Latin, mixed-script content, prices, and numeric data — so that the visual experience is consistent, polished, and culturally appropriate.

**Why this priority**: Typography is the highest-impact visual element. Without Tajawal loaded and tokenized, all other UI work renders with fallback system fonts and looks inconsistent.

**Independent Test**: Launch the app and verify that all text rendered by shared UI components uses Tajawal. Confirm Arabic text, English text, mixed Arabic/English text, prices, and numbers all display correctly with the expected font weights.

**Acceptance Scenarios**:

1. **Given** the app launches, **When** the font loading completes, **Then** Tajawal is available globally and text components render with it — including Arabic, Latin, mixed content, prices, and numbers.
2. **Given** the fonts have not finished loading, **When** the app is opening, **Then** the main UI does not render until fonts are ready (splash/loading screen persists).
3. **Given** a developer uses a typography token (e.g., `headingLarge`), **When** it renders, **Then** the correct font family, size, weight, line height, and letter spacing are applied without per-screen overrides.

---

### User Story 4 — Reusable UI Primitives (Priority: P2)

As a developer, I want a set of reusable, theme-aware UI primitive components (Button, Card, Text, Input, Badge, Chip, Divider, Avatar, SearchBar, QuantitySelector, SectionHeader, LoadingState, EmptyState, ErrorState) so that I can build feature screens without duplicating styling or layout logic.

**Why this priority**: Primitives consume the tokens from US1–US3. They are the building blocks for Phase 3's screen-by-screen migration and for any new features built after this phase.

**Independent Test**: Render each shared primitive component in isolation (e.g., in a test screen or Storybook-style view) and confirm it renders correctly, consumes theme tokens, and supports its documented variants/states.

**Acceptance Scenarios**:

1. **Given** the Button component, **When** rendered with variant `primary`, size `medium`, state `default`, **Then** it displays the correct colors, typography, radius, and spacing from theme tokens.
2. **Given** the Button component, **When** rendered with variant `destructive`, state `disabled`, **Then** it visually communicates the destructive intent and the disabled state (muted appearance, non-interactive).
3. **Given** the Button component, **When** rendered with an icon and in RTL mode, **Then** the icon position is mirrored correctly.
4. **Given** the Card component, **When** rendered with variant `elevated`, **Then** it uses the elevation tokens from the theme — no hardcoded shadow values.
5. **Given** the Input component, **When** rendered with a validation error, **Then** the error state is visually distinct (border color, error message) and uses theme tokens.
6. **Given** any shared primitive, **When** the theme switches from light to dark mode, **Then** the component re-renders with the correct dark-mode tokens.

---

### User Story 5 — Required UI Libraries Installed and Configured (Priority: P2)

As a developer, I want the required UI-support libraries (react-native-reanimated, react-native-gesture-handler, expo-haptics, @gorhom/bottom-sheet, FlashList, and the chosen icon library) installed and correctly configured so that Phase 2 and Phase 3 can use them without setup friction.

**Why this priority**: Libraries must be compatible with the current project and each other before any feature code depends on them. Installing them now prevents version-conflict surprises during later phases.

**Independent Test**: Import each library in a test file, call a basic API (e.g., create a simple Reanimated shared value, render a GestureDetector, trigger a haptic, render a BottomSheet, render a FlashList, render an icon), and confirm no runtime errors occur.

**Acceptance Scenarios**:

1. **Given** react-native-reanimated is installed, **When** a shared value is created in a component, **Then** it initializes without error on both platforms.
2. **Given** @gorhom/bottom-sheet is installed, **When** a `Sari3BottomSheet` wrapper component is rendered, **Then** it opens, closes, and respects theme tokens (radius, background, handle, spacing).
3. **Given** the chosen icon library is installed, **When** a directional icon (e.g., back arrow, chevron) is rendered in RTL mode, **Then** the icon is horizontally mirrored.
4. **Given** FlashList is installed, **When** a list component uses it, **Then** it renders without error and behaves equivalently to FlatList for the same data.

---

### User Story 6 — RTL-First and Accessibility Foundations (Priority: P3)

As an Arabic-speaking user, I want the app's shared UI layer to be RTL-aware (text alignment, layout direction, icon direction, horizontal spacing, input alignment, navigation controls) so that the interface feels native and natural. As a user with accessibility needs, I want components to have adequate contrast, practical touch targets, readable typography, accessibility labels, and screen-reader semantics.

**Why this priority**: RTL and accessibility are cross-cutting concerns that are cheaper to build into primitives now than to retrofit later. They do not block the token system or library installation, so P3 is appropriate.

**Independent Test**: Render shared UI components with the device/emulator language set to Arabic (RTL) and verify layout mirroring, icon direction, and text alignment. Inspect components for accessibility labels, touch target sizes, and contrast.

**Acceptance Scenarios**:

1. **Given** the device is set to an RTL language, **When** a shared Button with a leading icon renders, **Then** the icon appears on the start side (right in RTL) and text flows right-to-left.
2. **Given** a shared Input component is rendered in RTL mode, **When** the user types, **Then** placeholder text, label, and user input align correctly for RTL.
3. **Given** any interactive shared component, **When** inspected for touch target size, **Then** the target meets a minimum of 44×44 points.
4. **Given** any shared component rendering text, **When** important information is conveyed, **Then** it does not depend on color alone — a text label, icon, or other non-color cue is also present.

---

### Edge Cases

- What happens when Tajawal fails to load? → The app must not render the main UI until fonts are confirmed loaded; a splash/loading state persists until ready.
- What happens when a theme token is referenced that does not exist? → The build should fail or produce a clear error at development time — tokens are typed and statically checked.
- What happens when a component is rendered without a ThemeProvider ancestor? → Sensible defaults (light theme) are used; the component does not crash.
- What happens when a directional icon is used but the layout direction is unknown? → Default to LTR behavior (graceful fallback).
- What happens when the dark theme is incomplete (some tokens missing)? → The architecture must require both themes to define the same full set of semantic tokens; missing tokens cause a development-time error.

---

## Requirements *(mandatory)*

### Functional Requirements

**Theme & Tokens**

- **FR-001**: The system MUST provide a centralized theme directory (`src/shared/ui/theme/`) containing separate token modules for colors, typography, spacing, radii, shadows/elevation, and motion.
- **FR-002**: Color tokens MUST include both raw palette values (primary: #FFB800, secondary: #1A1A1A, tertiary/success: #27AE60, neutral: #F8F9FA) and derived semantic tokens (at minimum: `primary`, `primaryPressed`, `primaryDisabled`, `primarySubtle`, `secondary`, `success`, `warning`, `error`, `info`, `background`, `surface`, `surfaceElevated`, `textPrimary`, `textSecondary`, `textMuted`, `textInverse`, `border`, `divider`, `disabled`).
- **FR-003**: The primary color (#FFB800) MUST NOT be used as a filled background with white text unless contrast meets WCAG AA for normal text (4.5:1). A darker shade from the primary scale MUST be provided for filled-button backgrounds.
- **FR-004**: Typography tokens MUST include at minimum: `display`, `headingLarge`, `headingMedium`, `headingSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `caption`, `label`, `button`, `price`, `numeric`. Each token MUST define `fontFamily`, `fontSize`, `fontWeight`, and `lineHeight`. `letterSpacing` MUST be defined where appropriate.
- **FR-005**: Spacing tokens MUST be centralized in `src/shared/ui/theme/spacing.ts` and used consistently by shared UI components for padding, margins, and gaps — not arbitrary numeric literals.
- **FR-006**: Border-radius tokens MUST include at minimum: `none`, `small`, `medium`, `large`, `extraLarge`, `pill`.
- **FR-007**: Elevation/shadow tokens MUST use subtle values. The system MUST NOT produce large, dark, aggressive shadows. Surface contrast, subtle borders, and light elevation are preferred.
- **FR-008**: Motion tokens MUST include at minimum: `durationFast`, `durationNormal`, `durationSlow`, `easingStandard`, `easingEmphasized`, `easingDecelerated`, `easingAccelerated`. No screen-specific animations are created in this phase.

**Dark Mode**

- **FR-009**: The theme system MUST define both a light theme and a dark theme, each providing the full set of semantic color tokens.
- **FR-010**: The dark theme MUST use semantically appropriate colors — not a simple numeric inversion of the light palette.
- **FR-011**: The Sari3 primary brand identity (derived from #FFB800) MUST remain visually recognizable in dark mode.
- **FR-012**: A theme selection/context mechanism MUST be established so that components can consume the active theme without prop drilling.
- **FR-013**: Existing screens are NOT required to support dark mode in this phase. Only the shared UI layer and its primitives MUST render correctly in both themes.

**Typography / Fonts**

- **FR-014**: The Tajawal font MUST be installed and loaded before the main UI renders. The app MUST show a splash/loading state until fonts are confirmed ready.
- **FR-015**: Tajawal MUST support Arabic text, Latin text, mixed Arabic/English content, prices, numbers, product names, buttons, and navigation labels.

**Reusable UI Primitives**

- **FR-016**: A shared Button component (`src/shared/ui/components/Button.tsx`) MUST remain the single Button implementation. No duplicate Button components (e.g., PrimaryButton, SecondaryButton, CheckoutButton) may be created.
- **FR-017**: The Button component MUST support variants (`primary`, `secondary`, `outlined`, `inverted`, `ghost`, `destructive`), sizes (`small`, `medium`, `large`), states (`default`, `pressed`, `loading`, `disabled`), optional icon with RTL-aware positioning, and full-width mode.
- **FR-018**: A reusable Card primitive MUST be created supporting variants: `default`, `elevated`, `outlined`, `flat`. It MUST consume theme tokens for styling. Feature-specific cards (e.g., StoreCard, ProductCard) compose this primitive.
- **FR-019**: A shared Text component MUST exist, consuming typography tokens and supporting: typography variant selection, color token, alignment, number-of-lines truncation, RTL text, and accessibility properties.
- **FR-020**: A reusable Input component MUST be created supporting: label, placeholder, error state, disabled state, focused state, optional leading icon, optional trailing action, and RTL layout. It MUST consume theme colors, typography, spacing, and radii tokens.
- **FR-021**: Additional shared primitives MUST be created or extended as needed: IconButton, Badge, Chip, Divider, Avatar, SearchBar, QuantitySelector, SectionHeader, LoadingState, EmptyState, ErrorState. Only components genuinely needed by the current architecture are required — no speculative library.
- **FR-022**: The Sari3BottomSheet wrapper component MUST wrap @gorhom/bottom-sheet and allow control of: theme, radius, background, handle, spacing, accessibility, and animation configuration. No Liquid Glass or blur effects.

**Libraries**

- **FR-023**: `react-native-reanimated` MUST be installed and configured, compatible with the current Expo SDK and React Native architecture. No existing animations are migrated in this phase.
- **FR-024**: `react-native-gesture-handler` MUST be installed and configured. No unnecessary gesture interactions are introduced in this phase.
- **FR-025**: `expo-haptics` MUST be installed and available for future use. Haptics are NOT added to components in this phase.
- **FR-026**: `@gorhom/bottom-sheet` MUST be installed and integrated via the `Sari3BottomSheet` wrapper (FR-022).
- **FR-027**: FlashList (`@shopify/flash-list`) MUST be installed if compatible with the current project. No existing FlatLists are migrated in this phase.
- **FR-028**: ONE primary icon library MUST be chosen (preferred: `lucide-react-native`; alternative: `@expo/vector-icons`). A lightweight shared Icon abstraction MUST support size, color, accessibility labels, and RTL-aware directional icons (back, forward, chevron, arrow).

**RTL & Accessibility**

- **FR-029**: The shared UI layer MUST be RTL-aware: text alignment, layout direction, icon direction, horizontal spacing, input alignment, and navigation controls MUST behave correctly when the device language is RTL.
- **FR-030**: Reusable UI components MUST provide adequate contrast, practical touch target sizes (minimum 44×44 points), readable typography, disabled/loading/error states, accessibility labels, and screen-reader semantics. Important information MUST NOT depend on color alone.

**Boundaries & Exclusions**

- **FR-031**: Shared UI components MUST NOT contain any business logic — no Supabase queries, no authentication rules, no order/cart logic, no feature-specific server-state logic. They belong exclusively to the Presentation layer.
- **FR-032**: The existing feature-first architecture, domain models, repository contracts, and application layer MUST remain completely intact. No restructuring.
- **FR-033**: The following MUST NOT be introduced: `expo-blur`, Liquid Glass, glassmorphism, blur-based cards, blur-based navigation, translucent glass UI, or `@expo/ui` as a core dependency.
- **FR-034**: No large generic UI component framework (Material/Ant-style UI kit) MUST be introduced unless explicitly approved.
- **FR-035**: Existing screens MUST NOT be redesigned or migrated in this phase. Phase 3 handles screen-by-screen migration.

### Key Entities

- **ThemeTokens**: The complete set of design tokens (colors, typography, spacing, radii, shadows, motion) that define the Sari3 visual language. Two variants: light and dark.
- **UIComponent**: A reusable, theme-aware presentation-layer primitive (Button, Card, Text, Input, etc.) that consumes ThemeTokens and supports variants, states, RTL, and accessibility.
- **IconAbstraction**: A lightweight wrapper over the chosen icon library providing size, color, a11y labels, and RTL direction awareness.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of shared UI components consume theme tokens — zero hardcoded color, font, spacing, or shadow values in the shared UI layer.
- **SC-002**: Switching the theme context between light and dark mode re-renders all shared UI primitives with the correct palette — verifiable by visual inspection or screenshot comparison.
- **SC-003**: Tajawal renders correctly for Arabic text, Latin text, mixed content, prices, and numbers — verifiable on both platforms.
- **SC-004**: All interactive shared components have a touch target of at least 44×44 points — verifiable by layout inspection.
- **SC-005**: The shared Button component supports all 6 variants × 3 sizes × 4 states — verifiable by rendering each combination.
- **SC-006**: Directional icons (back, forward, chevron, arrow) mirror correctly when the device is set to an RTL language — verifiable by screenshot comparison.
- **SC-007**: Zero new business-logic imports (Supabase, auth, cart, orders) exist in any file under `src/shared/ui/` — verifiable by static analysis / grep.
- **SC-008**: All 6 approved UI-support libraries are installed, importable, and produce no runtime errors on basic usage — verifiable by a smoke-test screen.
- **SC-009**: Existing feature screens continue to function without regression — no business logic, routing, or data-fetching behavior has changed.

---

## Assumptions

- **A-001**: The existing `src/shared/ui/theme/` directory (containing `colors.ts`, `spacing.ts`, `typography.ts`) will be extended and refactored — not replaced from scratch. Existing token consumers will be migrated to the new token API.
- **A-002**: The existing `src/shared/ui/components/Button.tsx` will be extended with variant/size/state support — not deleted and recreated.
- **A-003**: Tajawal font files will be loaded via the standard Expo font loading mechanism (e.g., `expo-font` / `useFonts`). The specific loading strategy is determined during planning.
- **A-004**: The dark theme will be architecturally complete (all semantic tokens defined) but is NOT required to look production-polished on every existing screen. Visual polish of existing screens is Phase 3 scope.
- **A-005**: FlashList installation is conditional on compatibility with the current Expo SDK version. If incompatible, it is deferred — not forced.
- **A-006**: `lucide-react-native` is the preferred icon library. `@expo/vector-icons` is the fallback. The choice is confirmed during planning based on bundle size and icon coverage.
- **A-007**: No existing screen files (under `src/app/` or `src/features/*/presentation/`) are modified in this phase, except the root layout if required for ThemeProvider/font-loading setup.
- **A-008**: The `Sari3BottomSheet` wrapper replaces any ad-hoc bottom sheet usage in future phases — it does not retroactively replace existing modals in this phase.
- **A-009**: Motion tokens are values only (durations, easing curves). Reusable animation recipes (e.g., `fadeIn`, `slideUp`, `scalePress`) are Phase 2 scope.
- **A-010**: The theme context/provider mechanism will be added to the app's root layout so it is available to all screens, but no screen-level code is changed to consume it in this phase.
