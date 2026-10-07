# Research: UI Design System & Foundation (009)

**Feature**: `009-ui-design-foundation`
**Date**: 2026-09-28
**Purpose**: Resolve all technical unknowns before Phase 1 design

---

## D-001: Tajawal Font Loading Strategy

**Decision**: Use the `@expo-google-fonts/tajawal` package, loaded via `useFonts` from `expo-font`, integrated with the existing `expo-splash-screen` guard in `src/app/_layout.tsx`.

**Rationale**:
- `@expo-google-fonts/tajawal` is the canonical Expo-idiomatic font package; it bundles the font weights as local assets inside `node_modules`, avoiding network fetches at runtime and working in bare/managed workflows identically.
- The existing `_layout.tsx` already calls `SplashScreen.preventAutoHideAsync()` and defers `SplashScreen.hideAsync()` until `isLoading` (auth) resolves. Font loading is added as a parallel condition: the splash stays until BOTH auth AND fonts are resolved.
- `useFonts` returns `[fontsLoaded, fontError]`. The render guard checks `fontsLoaded` before rendering the navigator.
- Weights required: `Tajawal_400Regular`, `Tajawal_500Medium`, `Tajawal_600SemiBold`, `Tajawal_700Bold` — covering all typography token weight values.

**Alternatives considered**:
- Bundling font files manually in `assets/fonts/`: valid but adds maintenance burden (manual updates) and duplicates what the package already provides. Rejected for DX reasons.
- Loading from CDN at runtime: rejected — increases app startup time and fails offline.

---

## D-002: Theme Context Architecture

**Decision**: A single React Context (`ThemeContext`) wraps the entire app via `AppProviders.tsx`. It exposes the active `Theme` object (either `lightTheme` or `darkTheme`) and a `toggleTheme` / `setTheme` function. The current mode preference is persisted to `AsyncStorage` so it survives app restarts.

**Rationale**:
- React Context is the standard approach for app-wide UI state that is read frequently but changed rarely (theme switching). Overhead is negligible for a root context.
- `AsyncStorage` is already a project dependency — using it for theme preference adds zero new dependencies.
- The theme object is memoized so children that consume it only re-render on actual theme switches, not on every parent render.
- A `useTheme()` hook wraps `useContext(ThemeContext)` and provides a dev-mode guard if used outside the provider.

**Alternatives considered**:
- Redux slice for theme: rejected — Constitution Principle IV is explicit that Redux owns client-local state (cart, transient UI flags), not UI configuration. Theme is UI configuration, not server state or cart-like client state. However, it is not a raw session object either — using a dedicated `ThemeContext` (analogous to `AuthContext`) is the clean fit.
- Third-party theming library (e.g., `@shopify/restyle`): rejected — introduces a large framework dependency, contradicts FR-034.

---

## D-003: Semantic Color Token Strategy

**Decision**: The color module (`colors.ts`) exports three things:
1. `palette` — raw hex values organized by hue scale (for internal use only)
2. `lightTheme.colors` — semantic token object for light mode
3. `darkTheme.colors` — semantic token object for dark mode

Sari3 base palette (from spec):
- Primary: `#FFB800` (replaces incorrect current `#0D6EFD`)
- Primary filled-button shade (darker, WCAG AA on white): `#CC9400` (passes 4.5:1 contrast)
- Secondary: `#1A1A1A`
- Success/Tertiary: `#27AE60`
- Neutral/Background: `#F8F9FA`

Full semantic token list for both themes (see `data-model.md` for exact values).

**Alternatives considered**:
- Keeping the flat `colors` object and adding `dark.xxx` sub-keys (current pattern): rejected — breaks type safety and forces all consumers to do conditional lookups instead of consuming a resolved theme object.
- Using a CSS-variables approach: not applicable for React Native.

---

## D-004: Icon Library

**Decision**: `lucide-react-native` is the primary icon library.

**Rationale**:
- Lucide has excellent TypeScript support, tree-shakeable exports, consistent stroke-width design language, and covers all icons needed by the Sari3 UI (navigation, form, product, status icons).
- Compatible with React Native 0.86.3 / React 19 — uses SVG via `react-native-svg` which is bundled with Expo SDK 57.
- The shared `Icon.tsx` wrapper adds RTL direction mirroring (via a `style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}` on directional icons) and accessibility label support.

**Alternatives considered**:
- `@expo/vector-icons`: valid fallback; already included transitively by Expo. Rejected as primary because Lucide has a more modern, consistent design language and better TypeScript named exports.

---

## D-005: expo-haptics

**Decision**: Install `expo-haptics` using `npx expo install expo-haptics`. This is an Expo first-party package, compatible with SDK 57 by definition.

**Phase 1 scope**: Installation + a thin `haptics.ts` utility module that wraps the three common haptic patterns (`light`, `medium`, `success`) — ready for Phase 3 consumption. No component integrates haptics in Phase 1.

**Alternatives considered**: None — expo-haptics is the spec-mandated package.

---

## D-006: @gorhom/bottom-sheet

**Decision**: Install `@gorhom/bottom-sheet` v5+ (compatible with React Native New Architecture / Fabric used in RN 0.86.3 + Reanimated 4.x). Wrap in `Sari3BottomSheet.tsx` that forwards theme tokens (background color, border radius, handle style) and accessibility props.

**Critical note**: Reanimated 4.x changed the API surface from v3. `@gorhom/bottom-sheet` v5 targets Reanimated 3+ API, but Reanimated 4 introduced some breaking changes in shared value / worklet APIs. The wrapper must be validated to confirm the specific `@gorhom/bottom-sheet` version works with `react-native-reanimated@4.5.1` during implementation.

**Alternatives considered**: Building a custom bottom sheet from scratch using Reanimated 4 — rejected as unnecessary complexity (Constitution Principle X).

---

## D-007: @shopify/flash-list

**Decision**: Install `@shopify/flash-list`. FlashList v1.7+ supports React Native New Architecture (Fabric). RN 0.86.3 uses New Architecture by default, so the latest stable FlashList is required. Install as a peer-compatible version.

**Phase 1 scope**: Installation only. No FlatList migration. A simple smoke-test confirms it renders without error.

**Alternatives considered**: Deferring FlashList entirely — rejected because the spec (FR-027) requires installation in Phase 1. Phase 3 decides migration targets.

---

## D-008: ThemeProvider Placement in AppProviders

**Decision**: `ThemeProvider` is added as the **outermost** wrapper in `AppProviders.tsx`, wrapping all other providers. This ensures theme is available to every component in the tree, including those inside `SafeAreaProvider`, `Redux Provider`, `QueryClientProvider`, and `AuthProvider`.

```
ThemeProvider
  └── SafeAreaProvider
        └── Redux Provider
              └── QueryClientProvider
                    └── AuthProvider
```

**Rationale**: Theme is purely a UI concern and has no dependencies on auth, Redux, or TanStack Query. Placing it outermost means the provider chain doesn't need to change when other providers are added.

---

## D-009: Reanimated & Gesture Handler — Already Installed, New Architecture Compatible

**Decision**: Both libraries are already in `package.json` and are compatible with the current setup:
- `react-native-reanimated@4.5.1` — Reanimated 4 natively targets the New Architecture (no Babel plugin config needed for RN 0.86+; uses the Worklets package separately via `react-native-worklets@0.10.1` which is also already installed).
- `react-native-gesture-handler@~2.32.0` — GH v2.32 supports New Architecture.

**Phase 1 action**: Verify `GestureHandlerRootView` wraps the root layout (required by gesture-handler). Add it to `AppProviders.tsx` or `_layout.tsx` if not already present. No new installation needed.

**Alternatives considered**: None — both are already installed.

---

## D-010: Existing Component Migration Strategy

**Decision**: Existing components are extended in-place — no file is deleted. The migration pattern:

1. Each existing component imports tokens from the updated theme via `useTheme()`.
2. All hardcoded color/font/spacing literals are replaced by token references.
3. New props (variant, size, state, RTL, a11y labels) are added with backwards-compatible defaults so no existing call sites break.

This approach preserves git history and avoids breaking any currently working feature screen.

**Alternatives considered**: Rewriting components fresh and updating all import sites — rejected because existing screens may already use component-level props that must remain stable.
