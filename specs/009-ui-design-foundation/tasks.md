# Tasks: UI Design System & Foundation — Phase 1 (009)

**Feature**: `009-ui-design-foundation`
**Date**: 2026-09-28
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/component-contracts.md](./contracts/component-contracts.md)

---

## Phase 1: Setup (Package Installation)

**Purpose**: Install missing approved libraries. Reanimated and Gesture Handler are already installed — skip them.

- [x] T001 Install `@expo-google-fonts/tajawal` font package using the project's package manager (confirms Tajawal weights: `Tajawal_400Regular`, `Tajawal_500Medium`, `Tajawal_600SemiBold`, `Tajawal_700Bold` are bundled as local assets)
- [x] T002 Install `expo-haptics` using `npx expo install expo-haptics`
- [x] T003 Install `@gorhom/bottom-sheet` at a version compatible with `react-native-reanimated@4.5.1` (check release notes for Reanimated 4 compatibility before pinning)
- [x] T004 Install `@shopify/flash-list` at a version compatible with React Native New Architecture / Fabric (RN 0.86.3)
- [x] T005 Install `lucide-react-native` (requires `react-native-svg` which is already bundled with Expo SDK 57 — no extra install)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the complete token system, ThemeContext, and font loading guard. Every user story depends on these — no component can be built until tokens exist.

**⚠️ CRITICAL**: All User Story phases are blocked until this phase is complete.

- [x] T006 Refactor `src/shared/ui/theme/colors.ts` — replace wrong primary `#0D6EFD` with `#FFB800`; add full `palette` const (private, unexported); define and export `ColorTokens` interface with all 21 semantic fields (`primary`, `primaryPressed`, `primaryDisabled`, `primarySubtle`, `secondary`, `success`, `successSubtle`, `warning`, `warningSubtle`, `error`, `errorSubtle`, `info`, `infoSubtle`, `background`, `surface`, `surfaceElevated`, `textPrimary`, `textSecondary`, `textMuted`, `textInverse`, `textDisabled`, `border`, `divider`, `disabled`, `overlay`); export `lightColors: ColorTokens` and `darkColors: ColorTokens` with exact values from [data-model.md §1.1](./data-model.md)
- [x] T007 Refactor `src/shared/ui/theme/typography.ts` — replace `h1/h2/body` naming with `TypographyVariant` union (`display`, `headingLarge`, `headingMedium`, `headingSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `caption`, `label`, `button`, `price`, `numeric`); add `FontFamily` const mapping Tajawal weight names; add `fontFamily` field to every token entry; export `TypographyTokens` type; use exact values from [data-model.md §1.2](./data-model.md)
- [x] T008 Refactor `src/shared/ui/theme/spacing.ts` — keep spacing scale but add `xxs: 2` and `xxxl: 64`; REMOVE borderRadius from this file (extracted in T009); export `SpacingScale` type
- [x] T009 Create `src/shared/ui/theme/radii.ts` — define `RadiiTokens` interface with `none`, `small`, `medium`, `large`, `extraLarge`, `pill`; export `radii: RadiiTokens` with values: `none=0`, `small=4`, `medium=8`, `large=12`, `extraLarge=20`, `pill=9999`
- [x] T010 Create `src/shared/ui/theme/shadows.ts` — define `ElevationLevel` and `ShadowTokens` interfaces; export `shadows: ShadowTokens` with levels `none`, `low`, `medium`, `high` using subtle `shadowOpacity` values (0.06, 0.10, 0.14) per [data-model.md §1.5](./data-model.md); no large dark shadows
- [x] T011 Create `src/shared/ui/theme/motion.ts` — define `MotionTokens` interface with `durationFast=150`, `durationNormal=250`, `durationSlow=400` and four easing string tokens (`easingStandard`, `easingEmphasized`, `easingDecelerated`, `easingAccelerated`) per [data-model.md §1.6](./data-model.md)
- [x] T012 Create `src/shared/ui/theme/index.ts` — define `Theme` interface composing `ColorTokens`, `TypographyTokens`, `SpacingScale`, `RadiiTokens`, `ShadowTokens`, `MotionTokens`; export `lightTheme: Theme` (using `lightColors`) and `darkTheme: Theme` (using `darkColors`); re-export all types per [data-model.md §1.7](./data-model.md)
- [x] T013 Create `src/shared/ui/context/ThemeContext.tsx` — implement `ThemeContextValue` interface (`theme`, `isDark`, `setDark`, `toggleTheme`); read initial mode from `AsyncStorage` key `@sari3/theme-mode` with fallback to `useColorScheme()`; memoize theme object so consumers only re-render on actual mode change; export `ThemeProvider` component and `useTheme()` hook that throws a dev-mode error if used outside provider
- [x] T014 Update `src/providers/AppProviders.tsx` — wrap entire tree with `ThemeProvider` as the outermost provider (above `SafeAreaProvider`); ensure provider nesting order: `ThemeProvider > SafeAreaProvider > Redux Provider > QueryClientProvider > AuthProvider`
- [x] T015 Update `src/app/_layout.tsx` — add `useFonts({ Tajawal_400Regular, Tajawal_500Medium, Tajawal_600SemiBold, Tajawal_700Bold })` from `@expo-google-fonts/tajawal`; extend the existing `SplashScreen.hideAsync()` guard so splash hides only when BOTH `!isLoading` (auth) AND `fontsLoaded` are true; render blank view if either is still pending
- [x] T016 Create `src/shared/ui/utils/haptics.ts` — thin wrapper around `expo-haptics` exporting `triggerLight()`, `triggerMedium()`, `triggerSuccess()` convenience functions; no component integration in Phase 1
- [x] T017 Verify `GestureHandlerRootView` wraps the root layout or `AppProviders.tsx` — add it if missing (required by `react-native-gesture-handler`)

**Checkpoint**: Theme system complete. All token files exist, ThemeContext is live, fonts load before UI renders, providers are wired. User Story phases can now proceed.

---

## Phase 3: User Story 1 — Centralized Theme System (Priority: P1) 🎯 MVP Core

**Goal**: Every shared UI component consumes theme tokens — zero hardcoded color/font/spacing/shadow values in the shared UI layer.

**Independent Test**: Import `lightTheme` and call `theme.colors.primary` → `#FFB800`. Import a component, inspect its StyleSheet, and confirm no hex literals exist. Run: `grep -r "#[0-9A-Fa-f]\{3,6\}" src/shared/ui/components/` → must return zero results.

- [x] T018 [US1] Create `src/shared/ui/context/index.ts` — barrel export for `useTheme`, `ThemeProvider`, `ThemeContext`
- [x] T019 [P] [US1] Create `src/shared/ui/components/Icon.tsx` — lucide-react-native wrapper; props: `name: string`, `size=24`, `color` (defaults to `theme.colors.textPrimary`), `accessibilityLabel`, `accessibilityHidden`; apply `transform: [{ scaleX: -1 }]` for RTL directional icons using `I18nManager.isRTL` check; define `RTL_DIRECTIONAL_ICONS` array per [contracts §5](./contracts/component-contracts.md)
- [x] T020 [P] [US1] Create `src/shared/ui/components/Text.tsx` — themed Text primitive; props: `variant: TypographyVariant` (default `bodyMedium`), `color: keyof ColorTokens` (default `textPrimary`), `align`, `numberOfLines`, `accessibilityRole`, `style`, `children`; spreads `theme.typography[variant]` and resolves `theme.colors[color]`; no hardcoded font values
- [x] T021 [P] [US1] Create `src/shared/ui/components/Divider.tsx` — props: `orientation` (default `horizontal`), `spacing` (`none|sm|md|lg`), `color` (default `theme.colors.divider`); uses `theme.spacing` for margins; no hardcoded values
- [x] T022 [US1] Extend `src/shared/ui/components/Button.tsx` — add `variant: ButtonVariant` (`primary|secondary|outlined|inverted|ghost|destructive`), `size: ButtonSize` (`small|medium|large`), `loading: boolean`, `icon?: ReactNode`, `iconPosition: 'left'|'right'` (RTL-aware), `fullWidth: boolean`; all colors/fonts/radii/spacing resolved from `useTheme()`; minimum touch target 44pt enforced via `minHeight`; backwards-compatible defaults preserve existing call sites; no hardcoded values per [contracts §1](./contracts/component-contracts.md)
- [x] T023 [US1] Extend `src/shared/ui/components/Input.tsx` — add `label`, `error`, `leadingIcon`, `trailingAction` props; wire focused/error/disabled visual states to `theme.colors.*`; use `theme.typography.bodyMedium` for input text; use `theme.radii.medium` and `theme.spacing.*` for layout; RTL layout via `I18nManager.isRTL`; backwards-compatible; no hardcoded values per [contracts §4](./contracts/component-contracts.md)
- [x] T024 [US1] Extend `src/shared/ui/components/EmptyState.tsx` — wire all colors to `theme.colors.*`, typography to `theme.typography.*`, spacing to `theme.spacing.*`; accept `icon`, `title`, `message`, `action` props per [contracts §14](./contracts/component-contracts.md)
- [x] T025 [US1] Extend `src/shared/ui/components/ErrorView.tsx` → rename/extend to `ErrorState.tsx` — wire all styling to theme tokens; accept `title`, `message`, `onRetry`, `fullPage` per [contracts §15](./contracts/component-contracts.md); keep `ErrorView.tsx` as a re-export alias for backwards compat
- [x] T026 [US1] Extend `src/shared/ui/components/LoadingSpinner.tsx` → update to `LoadingState.tsx` — wire `color` to `theme.colors.primary` default; support `size` and `fullPage` props per [contracts §13](./contracts/component-contracts.md); keep `LoadingSpinner.tsx` as re-export alias

**Checkpoint**: US1 complete. All existing components now consume theme tokens. Zero hardcoded values in `src/shared/ui/components/`.

---

## Phase 4: User Story 2 — Light and Dark Theme Architecture (Priority: P1)

**Goal**: Toggling theme mode re-renders all shared UI primitives with the correct palette. Dark theme is semantically defined (not a simple inversion). Sari3 brand identity (`#FFB800`) remains recognizable in dark mode.

**Independent Test**: Call `toggleTheme()` and visually confirm background switches from `#F8F9FA` to `#0D0D0D` and primary remains `#FFB800`. Confirm `darkColors` has all 25 semantic tokens defined (no `undefined`).

- [x] T027 [US2] Validate `darkColors` in `src/shared/ui/theme/colors.ts` against all 25 semantic token fields defined in `lightColors` — every field must be defined, semantically appropriate (not a hex inversion), and `primary` must remain `#FFB800`; add a TypeScript `satisfies ColorTokens` check to both exports to catch missing tokens at compile time
- [x] T028 [US2] Add a dev-mode theme toggle button (visible only in `__DEV__` mode) to `src/app/_layout.tsx` or a dedicated dev screen — calls `toggleTheme()` from `useTheme()` — so the dual-theme can be verified without a device settings change

**Checkpoint**: US2 complete. Both themes are verifiable and semantically complete with type-safety enforced.

---

## Phase 5: User Story 3 — Tajawal Typography System (Priority: P1)

**Goal**: Tajawal renders for Arabic, Latin, mixed, price, and numeric text. Typography is tokenized. No per-screen font overrides.

**Independent Test**: Set device locale to Arabic, launch app — all text renders in Tajawal. Set locale to English — text still renders in Tajawal. Check splash screen shows until font resolves.

- [x] T029 [US3] Audit all files under `src/shared/ui/components/` for inline `fontFamily`, `fontSize`, `fontWeight` style values — replace every occurrence with the appropriate `theme.typography.*` variant spread
- [x] T030 [P] [US3] Audit `src/app/_layout.tsx` font loading guard — confirm the `SplashScreen.hideAsync()` condition includes `fontsLoaded` (from T015); add a `fontError` fallback: if fonts fail to load after timeout, log the error and proceed (do not hang the app forever)

**Checkpoint**: US3 complete. Tajawal is loaded and tokens are the only source of typography values.

---

## Phase 6: User Story 4 — Reusable UI Primitives (Priority: P2)

**Goal**: All required shared primitives exist, consume theme tokens, support their documented variants/states, and are RTL-aware and accessible.

**Independent Test**: Render each primitive in isolation (test screen). Visually confirm variant rendering and token consumption. Run the zero-hardcode audit (`grep -r "#[0-9A-Fa-f]\{3,6\}" src/shared/ui/components/`) → zero results.

- [x] T031 [P] [US4] Create `src/shared/ui/components/Card.tsx` — variants `default|elevated|outlined|flat`; `elevated` uses `theme.shadows.low`; `outlined` uses `theme.colors.border` with `borderWidth=1`; `flat` has no shadow/border; all use `theme.radii.medium` and `theme.colors.surface`; optional `onPress` makes card pressable; no hardcoded values per [contracts §2](./contracts/component-contracts.md)
- [x] T032 [P] [US4] Create `src/shared/ui/components/Badge.tsx` — variants `primary|success|warning|error|info|neutral`; `size: 'small'|'medium'`; background from `theme.colors.*Subtle`, text from `theme.colors.*`; uses `theme.radii.pill` and `theme.typography.label` per [contracts §6](./contracts/component-contracts.md)
- [x] T033 [P] [US4] Create `src/shared/ui/components/Chip.tsx` — `selected` state uses `theme.colors.primary` background and `theme.colors.textInverse` text; unselected uses `theme.colors.surface` background and `theme.colors.border`; optional icon; `disabled` reduces opacity; `theme.radii.pill`; minimum 44pt touch target per [contracts §7](./contracts/component-contracts.md)
- [x] T034 [P] [US4] Create `src/shared/ui/components/Avatar.tsx` — `size: 'small'|'medium'|'large'` → 32/44/64pt; shows image if `source` provided; falls back to initials with `theme.colors.primarySubtle` background; `theme.radii.pill` for circular shape; `accessibilityLabel` per [contracts §9](./contracts/component-contracts.md)
- [x] T035 [P] [US4] Create `src/shared/ui/components/SearchBar.tsx` (shared primitive) — controlled input with search icon (using `Icon` from T019), clear button when value non-empty, `theme.colors.surface` background, `theme.colors.border` border, `theme.radii.large` corners, `theme.spacing.sm/md` padding; RTL-aware icon/clear button placement per [contracts §10](./contracts/component-contracts.md)
- [x] T036 [P] [US4] Create `src/shared/ui/components/QuantitySelector.tsx` — minus/plus `IconButton`s flanking a quantity label; enforces `min` (default 1) and `max` (default 99); `disabled` state when at bounds; uses `theme.colors.*` and `theme.spacing.*`; all targets ≥ 44pt per [contracts §11](./contracts/component-contracts.md)
- [x] T037 [P] [US4] Create `src/shared/ui/components/SectionHeader.tsx` — `title` in `theme.typography.headingSmall`; optional `action` button in `theme.colors.primary`; `theme.spacing.md` padding per [contracts §12](./contracts/component-contracts.md)
- [x] T038 [US4] Create `src/shared/ui/components/IconButton.tsx` — pressable icon wrapper; `size: 'small'|'medium'|'large'` → 32/44/56pt container; `variant: 'default'|'ghost'|'outlined'`; `accessibilityLabel` required; uses `Icon` from T019; all targets ≥ 44pt

**Checkpoint**: US4 complete. All 15+ primitives exist and are individually testable against the component contracts.

---

## Phase 7: User Story 5 — UI Libraries Installed and Configured (Priority: P2)

**Goal**: All 4 newly installed libraries (`expo-haptics`, `@gorhom/bottom-sheet`, `@shopify/flash-list`, `lucide-react-native`) are importable, functional, and confirmed compatible with the New Architecture.

**Independent Test**: Run the library smoke test (quickstart Scenario 9) — each library renders/executes a basic API without runtime error.

- [x] T039 [US5] Create `src/shared/ui/components/Sari3BottomSheet.tsx` — wraps `@gorhom/bottom-sheet`; forwards `snapPoints`, `children`, `onClose`, `enablePanDownToClose` (default `true`); applies theme tokens internally: `background: theme.colors.surfaceElevated`, `borderTopLeftRadius: theme.radii.extraLarge`, `borderTopRightRadius: theme.radii.extraLarge`; styled handle using `theme.colors.border`; `accessibilityLabel` support; NO blur, NO glass effects per [contracts §16](./contracts/component-contracts.md)
- [x] T040 [US5] Confirm FlashList works with New Architecture — create a minimal `<FlashList>` usage example in a comment or dev screen; confirm `estimatedItemSize` is always required (enforced with PropTypes/TypeScript) to avoid FlashList warnings
- [x] T041 [US5] Verify Reanimated 4 + Gesture Handler 2.32 integration — confirm `GestureHandlerRootView` is wrapping the root (from T017); create a simple `useSharedValue` + `useAnimatedStyle` usage in a dev comment to confirm worklet compilation succeeds with New Architecture

**Checkpoint**: US5 complete. All libraries functional and New Architecture–compatible.

---

## Phase 8: User Story 6 — RTL-First and Accessibility Foundations (Priority: P3)

**Goal**: All shared components mirror correctly in RTL; all interactive components meet 44pt touch target; important information is not conveyed by color alone.

**Independent Test**: Set device to Arabic locale — all shared components render with correct RTL layout, icon mirroring, text alignment. Run accessibility audit: every interactive component has `accessibilityLabel` or `accessibilityRole`.

- [x] T042 [US6] Audit all components created in T019–T038 — for every `TouchableOpacity`, `Pressable`, or `Button`, confirm: (a) `minHeight` / `minWidth` ≥ 44pt, (b) `accessibilityLabel` is set or defaults to visible text label, (c) `disabled` state visually differs from enabled (not color-only — also opacity or icon change)
- [x] T043 [US6] Audit all components for RTL correctness — for every component with left/right layout assumptions, confirm it uses `I18nManager.isRTL` or `flexDirection` / `alignItems: 'flex-start'` patterns that auto-mirror; specifically check: `Button` icon position (T022), `Input` leading/trailing icons (T023), `SearchBar` icon/clear placement (T035), `QuantitySelector` plus/minus order (T036), `Icon` directional mirroring (T019)
- [x] T044 [US6] Add `reducedMotion` utility to `src/shared/ui/utils/motion.ts` — exports `prefersReducedMotion(): boolean` (wraps `AccessibilityInfo.isReducedMotionEnabled`) and `safeMotionDuration(token: number): number` (returns 0 when reduced motion is preferred, otherwise returns the token value); Phase 2 animation recipes MUST use this

**Checkpoint**: US6 complete. RTL and accessibility foundations verified across all shared primitives.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verify zero leakage, update barrel exports, and confirm the existing app is unbroken.

- [x] T045 Create `src/shared/ui/components/index.ts` — barrel export for all shared components (Button, Card, Text, Input, Icon, IconButton, Badge, Chip, Divider, Avatar, SearchBar, QuantitySelector, SectionHeader, LoadingState, EmptyState, ErrorState, Sari3BottomSheet)
- [x] T046 [P] Run zero-hardcode audit: `grep -r "#[0-9A-Fa-f]\{3,6\}" src/shared/ui/components/ --include="*.ts" --include="*.tsx"` — zero results expected (exception: `colors.ts` palette block only)
- [x] T047 [P] Run zero business-logic audit: `grep -r "supabase\|useQuery\|useMutation\|useAppDispatch\|useAppSelector\|createSlice\|auth.uid" src/shared/ui/ --include="*.ts" --include="*.tsx"` — zero results required
- [ ] T048 Run all quickstart.md validation scenarios (1–11) and confirm: Tajawal font loads, theme toggles, existing feature screens (Home, auth, order flow, driver screens) render without crash or regression
- [x] T049 [P] Run TypeScript strict compilation: `tsc --noEmit` — zero type errors in `src/shared/ui/`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Setup (Phase 1 — T001–T005)
       │
       ▼
Foundational (Phase 2 — T006–T017)  ← BLOCKS EVERYTHING BELOW
       │
       ├──── US1 (Phase 3 — T018–T026) — Token consumption by components
       │             │
       │             ├──── US2 (Phase 4 — T027–T028) — Dark theme validation
       │             │
       │             ├──── US3 (Phase 5 — T029–T030) — Typography audit
       │             │
       │             ├──── US4 (Phase 6 — T031–T038) — New primitives
       │             │
       │             └──── US5 (Phase 7 — T039–T041) — Library wiring
       │
       └──── US6 (Phase 8 — T042–T044) — depends on US1–US5 complete
                     │
                     ▼
              Polish (Phase 9 — T045–T049)
```

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational (T006–T017). Delivers the core token-consumption pattern.
- **US2 (P1)**: Depends on US1 (ThemeContext + components must exist to test toggling).
- **US3 (P1)**: Depends on US1 (font audit requires components to exist).
- **US4 (P2)**: Depends on US1 (new primitives must use `useTheme()`). All new primitives in US4 can be built in parallel with each other.
- **US5 (P2)**: Depends on Phase 1 Setup (libraries installed). `Sari3BottomSheet` additionally depends on US1 for theme tokens.
- **US6 (P3)**: Depends on US1–US5 complete (audits all components).

---

## Parallel Opportunities

**Phase 2 (Foundational)** — after T006 completes, these can proceed in parallel:
```
T007 (typography.ts) ‖ T008 (spacing.ts) ‖ T009 (radii.ts) ‖ T010 (shadows.ts) ‖ T011 (motion.ts)
then T012 (theme/index.ts) — depends on all above
then T013 (ThemeContext) ‖ T014 (AppProviders) ‖ T015 (_layout.tsx) ‖ T016 (haptics.ts)
```

**Phase 3 (US1)** — after T022 (Button) and T023 (Input) complete:
```
T019 (Icon) ‖ T020 (Text) ‖ T021 (Divider) — fully parallel
T024 (EmptyState) ‖ T025 (ErrorState) ‖ T026 (LoadingState) — fully parallel
```

**Phase 6 (US4)** — all 7 new primitives are independent files:
```
T031 (Card) ‖ T032 (Badge) ‖ T033 (Chip) ‖ T034 (Avatar) ‖ T035 (SearchBar) ‖ T036 (QuantitySelector) ‖ T037 (SectionHeader)
```

---

## Implementation Strategy

### MVP First (User Stories 1–3 — the P1 token foundation)

1. Complete Phase 1: Install packages (T001–T005).
2. Complete Phase 2: Build the full token system (T006–T017). **Do not skip any token file.**
3. Complete Phase 3 (US1): Wire all existing components to consume tokens (T018–T026).
4. Complete Phase 4 (US2): Validate dark theme (T027–T028).
5. Complete Phase 5 (US3): Typography audit (T029–T030).
6. **STOP and VALIDATE**: Run quickstart Scenarios 1–3 + Scenario 11 (existing screens unbroken).
7. This delivers a complete, token-driven foundation ready for Phase 2 animation recipes.

### Incremental Delivery

1. **Foundation** (Phase 1 + 2 + US1): All tokens live, all existing components tokenized.
2. **Add US2**: Dark mode architecture verified.
3. **Add US3**: Typography fully tokenized.
4. **Add US4**: New primitives (Card, Badge, Chip, etc.) available for Phase 3 screen use.
5. **Add US5**: Library smoke tests pass.
6. **Add US6**: RTL and accessibility audit complete.
7. **Polish** (Phase 9): Audits pass, barrel exports complete, zero regressions.
