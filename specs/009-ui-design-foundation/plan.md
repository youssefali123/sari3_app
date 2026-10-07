# Implementation Plan: UI Design System & Foundation (Phase 1)

**Branch**: `009-ui-design-foundation` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-ui-design-foundation/spec.md`

---

## Summary

Establish the Sari3 UI design-system foundation: replace the placeholder `colors.ts` / `typography.ts` / `spacing.ts` theme files with fully tokenized, dual-theme (light + dark) replacements; add the missing token files (`radii.ts`, `shadows.ts`, `motion.ts`, `index.ts`); load the Tajawal font before the main UI renders; install the three missing approved libraries (`expo-haptics`, `@gorhom/bottom-sheet`, `@shopify/flash-list` / `lucide-react-native`); extend the existing shared UI components to consume tokens and support variants/states/RTL/accessibility; and add a `ThemeProvider` to `AppProviders.tsx`. All existing business logic, domain contracts, Supabase integration, and feature architecture remain completely untouched.

---

## Technical Context

**Language/Version**: TypeScript (strict mode, ~6.0.3), React 19.2.3

**Framework**: React Native 0.86.3 + Expo SDK 57 (New Architecture / Fabric / TurboModules active)

**Routing**: Expo Router 57.0.23 (file-based)

**Font loading**: `expo-font` 57.0.3 — already installed. Tajawal loaded via `@expo-google-fonts/tajawal` package or direct asset files — see research D-001.

**Already installed (confirmed in package.json)**:
- `react-native-reanimated@4.5.1` ✅
- `react-native-gesture-handler@~2.32.0` ✅
- `expo-font@~57.0.3` ✅
- `expo-splash-screen@^57.0.9` ✅

**Missing (must be installed)**:
- `expo-haptics` — see research D-005
- `@gorhom/bottom-sheet` — see research D-006
- `@shopify/flash-list` — see research D-007
- `lucide-react-native` — see research D-004

**Existing theme files (must be refactored, not deleted)**:
- `src/shared/ui/theme/colors.ts` — wrong primary (#0D6EFD → must become #FFB800); no semantic tokens; flat object
- `src/shared/ui/theme/typography.ts` — old naming (h1/h2/body); no fontFamily; no Tajawal
- `src/shared/ui/theme/spacing.ts` — contains both spacing AND borderRadius in one file; borderRadius tokens incomplete (missing `none`, `extraLarge`, `pill`; has `borderRadius` as non-standard key)

**Existing components (must be extended, not deleted)**:
- `src/shared/ui/components/Button.tsx` — no variant/size/state support; must be extended
- `src/shared/ui/components/Input.tsx` — exists; needs token adoption + RTL
- `src/shared/ui/components/EmptyState.tsx` — exists; needs token adoption
- `src/shared/ui/components/ErrorView.tsx` — exists; needs token adoption
- `src/shared/ui/components/LoadingSpinner.tsx` — exists; needs token adoption

**Providers**: `src/providers/AppProviders.tsx` — `ThemeProvider` added here. Root layout (`src/app/_layout.tsx`) handles SplashScreen and auth loading; font loading guard is added here.

**Target Platform**: iOS + Android (React Native New Architecture)

**Performance Goals**: Font available before first frame; theme context adds zero render-cycle overhead on theme-stable renders

**Constraints**:
- No blur, no Liquid Glass, no `expo-blur`
- No `@expo/ui` as core dependency (already in package.json for edge cases — not used in the shared UI foundation)
- No generic Material/Ant UI kit
- All shared UI components MUST be pure Presentation layer — no Supabase, no Redux, no auth
- Existing screens unchanged (feature-first arch preserved)

---

## Constitution Check

*GATE: Must pass before Phase 0. Re-checked after Phase 1 design.*

| Principle | Gate | Status | Notes |
|---|---|---|---|
| **I. Feature-First Structure** | Shared UI lives under `src/shared/ui/` — NOT restructuring to `src/components/` | ✅ PASS | All new theme files: `src/shared/ui/theme/`. All new components: `src/shared/ui/components/`. No global restructure. |
| **II. Clean Architecture** | Shared UI = Presentation layer only. Domain/Application layers untouched. | ✅ PASS | ThemeProvider and UI primitives import nothing from domain, application, or infrastructure layers. |
| **III. Dependency Direction** | No business imports in shared/ui/ | ✅ PASS | `src/shared/ui/**` must not import from `src/features/**`, Supabase, TanStack Query, or Redux. |
| **IV. State Ownership** | Theme state = React Context (not Redux). No server state involved. | ✅ PASS | `ThemeContext` is a pure UI concern — distinct from auth session state (Exception IV-A). Theme selection is stored in AsyncStorage if persisted. |
| **V. Server Authority** | N/A — UI foundation is purely presentational. | ✅ N/A | |
| **VI. Atomic Writes** | N/A — no writes. | ✅ N/A | |
| **VII. Immutable Snapshots** | N/A — no transaction data. | ✅ N/A | |
| **VIII. Realtime / Push** | N/A — no realtime subscriptions. | ✅ N/A | |
| **IX. Deferred Scope** | Phase 2 (animation recipes) and Phase 3 (screen migration) can build on this foundation without breaking it. | ✅ PASS | Motion tokens defined; Reanimated configured; no screen-specific animations created. |
| **X. MVP Simplicity** | No DI containers, no theming library dependencies, no speculative component explosion | ✅ PASS | ~15 primitive components, all genuinely needed per spec. ThemeContext is a simple React context. |

**Post-Phase 1 re-check**: All gates remain PASS. Design artifacts introduce no violations.

---

## Project Structure

### Documentation (this feature)

```text
specs/009-ui-design-foundation/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output (token schemas + component API)
├── quickstart.md        ← Phase 1 output (validation guide)
├── contracts/
│   └── component-contracts.md   ← Phase 1 output (component API surface)
└── tasks.md             ← Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── shared/
│   └── ui/
│       ├── theme/
│       │   ├── colors.ts           REFACTOR — replace wrong primary; add semantic tokens; export light/dark themes
│       │   ├── typography.ts       REFACTOR — rename tokens; add Tajawal fontFamily; add missing variants
│       │   ├── spacing.ts          REFACTOR — keep spacing scale; extract borderRadius → radii.ts
│       │   ├── radii.ts            NEW — none/small/medium/large/extraLarge/pill
│       │   ├── shadows.ts          NEW — elevation tokens (subtle, light)
│       │   ├── motion.ts           NEW — duration + easing tokens
│       │   └── index.ts            NEW — barrel export: Theme type, lightTheme, darkTheme
│       ├── context/
│       │   └── ThemeContext.tsx     NEW — React context + useTheme hook + ThemeProvider
│       └── components/
│           ├── Button.tsx          EXTEND — variants, sizes, states, icon, full-width, RTL
│           ├── Card.tsx            NEW — variants: default/elevated/outlined/flat
│           ├── Text.tsx            NEW — typography-token-aware, RTL, a11y
│           ├── Input.tsx           EXTEND — token adoption, label, error, RTL, icons
│           ├── Badge.tsx           NEW
│           ├── Chip.tsx            NEW
│           ├── Divider.tsx         NEW
│           ├── Avatar.tsx          NEW
│           ├── SearchBar.tsx       NEW (renamed/new — distinct from features/search version)
│           ├── QuantitySelector.tsx NEW
│           ├── SectionHeader.tsx   NEW
│           ├── LoadingSpinner.tsx  EXTEND — token adoption
│           ├── EmptyState.tsx      EXTEND — token adoption
│           ├── ErrorView.tsx       EXTEND — token adoption
│           ├── Icon.tsx            NEW — lucide-react-native wrapper, RTL-aware directional icons
│           └── Sari3BottomSheet.tsx NEW — @gorhom/bottom-sheet wrapper
│
├── providers/
│   └── AppProviders.tsx            EXTEND — add ThemeProvider
│
└── app/
    └── _layout.tsx                 EXTEND — add useFonts guard + SplashScreen integration for Tajawal
```

**Structure Decision**: Extends the existing `src/shared/ui/` layout. `ThemeContext` lives in `src/shared/ui/context/` (a new sub-directory for UI contexts, distinct from feature-level contexts). This avoids any change to `src/providers/` structure except adding `ThemeProvider` as a wrapper.

---

## Complexity Tracking

> No Constitution Check violations — this section is intentionally blank.
