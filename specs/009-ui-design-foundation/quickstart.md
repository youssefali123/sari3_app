# Quickstart Validation Guide: UI Design System & Foundation (009)

**Feature**: `009-ui-design-foundation`
**Date**: 2026-09-28

---

## Prerequisites

1. All new packages installed: `@expo-google-fonts/tajawal`, `expo-haptics`, `@gorhom/bottom-sheet`, `@shopify/flash-list`, `lucide-react-native`.
2. Expo development server running: `npx expo start`.
3. Device or emulator connected (iOS or Android).
4. Device set to **English (LTR)** for initial scenarios; **Arabic** for RTL scenarios.

---

## Scenario 1 — Tajawal Font Loads Before UI Renders

**Goal**: Confirm Tajawal is loaded and available before any screen content appears.

**Steps**:
1. Cold-start the app on device.
2. Watch the splash screen.
3. When the Home screen (or auth screen) appears, visually inspect all text.

**Expected**:
- Tajawal renders on all text elements (Arabic and Latin).
- No system fallback font visible (no serif, no monospace).
- Splash screen is visible until both auth state AND fonts are resolved — no flash of unstyled text.

**Verification SQL / Log check**:
```
Search Expo logs for: "useFonts: Tajawal loaded" or equivalent debug output.
No [ERROR] font-related logs.
```

**References**: [research.md D-001](./research.md), [data-model.md §1.2](./data-model.md)

---

## Scenario 2 — Theme Token Smoke Test (Light Mode)

**Goal**: Confirm all semantic color, typography, spacing, radii, shadow, and motion tokens are resolvable and have non-empty values.

**Steps**:
1. Open a debug/test screen (or inspect via React DevTools) that imports `lightTheme` from `src/shared/ui/theme/index.ts`.
2. Log or display the full theme object.

**Expected**:
- `theme.colors.primary` → `#FFB800`
- `theme.colors.primaryPressed` → `#CC9400`
- `theme.colors.textPrimary` is NOT `#0D6EFD` (old incorrect value fully gone)
- `theme.typography.headingLarge.fontFamily` → `'Tajawal_700Bold'`
- `theme.spacing.md` → `16`
- `theme.radii.pill` → `9999`
- `theme.shadows.low.elevation` → `2`
- `theme.motion.durationNormal` → `250`
- No `undefined` or `null` values for any token

**References**: [data-model.md §1.1–1.7](./data-model.md)

---

## Scenario 3 — Light / Dark Theme Toggle

**Goal**: Confirm theme switching changes component rendering without requiring a reload.

**Steps**:
1. Open any screen that renders a `Button` (primary variant) and a `Text` component.
2. Call `toggleTheme()` (via a dev-mode toggle button or `ThemeContext` debug tool).

**Expected**:
- Button background color changes from light-primary to dark-primary.
- Screen background switches from `#F8F9FA` (light) to `#0D0D0D` (dark).
- Text color switches from `#212529` (light) to `#F2F2F7` (dark).
- Brand primary (#FFB800) remains recognizable in both modes.
- Toggle completes without re-mounting the navigator or losing navigation state.

**References**: [data-model.md §2 ThemeContext](./data-model.md), [contracts/component-contracts.md §17](./contracts/component-contracts.md)

---

## Scenario 4 — Button Variant Matrix

**Goal**: Confirm all 6 variants × 3 sizes render correctly with theme tokens.

**Steps**:
1. Open a dev/test screen or inspect the Home screen.
2. Render all Button combinations:
   - Variants: `primary`, `secondary`, `outlined`, `inverted`, `ghost`, `destructive`
   - Sizes: `small`, `medium`, `large`
   - States: `default`, `disabled`, `loading`

**Expected** (sample checks):
- `primary` + `medium` + `default`: background `#CC9400` (filled-button shade), white text, `radii.large` corners.
- `destructive` + `medium` + `disabled`: visually muted (low-opacity error color), non-pressable.
- `outlined` + `large`: border visible, transparent background.
- `loading` state: activity indicator replaces label text; button non-pressable.
- All sizes have minimum height of 44pt.

**RTL check**: Render a button with `icon` and `iconPosition='left'` in RTL mode → icon should appear on the right (RTL start side).

**References**: [contracts/component-contracts.md §1](./contracts/component-contracts.md), spec FR-016, FR-017

---

## Scenario 5 — Card Variants

**Goal**: Confirm `Card` component renders all 4 variants using theme tokens.

**Steps**:
1. Render `Card variant="default"`, `"elevated"`, `"outlined"`, `"flat"` on a test screen.

**Expected**:
- `elevated` has visible shadow (`shadows.low`), surface color `theme.colors.surface`.
- `outlined` has border (`theme.colors.border`), no shadow.
- `flat` has no border, no shadow.
- All use `radii.medium` (8pt) corner radius by default.
- Grep `src/shared/ui/components/Card.tsx` for hardcoded hex values → must return zero results.

**References**: [contracts/component-contracts.md §2](./contracts/component-contracts.md), spec FR-018

---

## Scenario 6 — Input States

**Goal**: Confirm the Input component handles all states correctly.

**Steps**:
1. Render Input in: default, focused, error, disabled states.
2. Verify RTL behavior by switching device to Arabic.

**Expected**:
- Error state: border changes to `theme.colors.error`, error message appears below.
- Disabled state: background changes to `theme.colors.disabled`, not interactive.
- Focused state: border changes to `theme.colors.primary`.
- In RTL: text alignment and icon positioning are mirrored.

**References**: [contracts/component-contracts.md §4](./contracts/component-contracts.md), spec FR-020

---

## Scenario 7 — RTL Icon Mirroring

**Goal**: Confirm directional icons mirror in RTL.

**Steps**:
1. Set device to Arabic locale.
2. Render `<Icon name="ChevronRight" />` and `<Icon name="ArrowLeft" />`.

**Expected**:
- `ChevronRight` icon appears horizontally flipped (pointing left, as appropriate for RTL "forward" direction).
- `ArrowLeft` appears flipped (pointing right, meaning "go back" in RTL).
- Non-directional icons (e.g., `ShoppingCart`, `Star`) are NOT flipped.

**References**: [contracts/component-contracts.md §5](./contracts/component-contracts.md), spec FR-029

---

## Scenario 8 — Sari3BottomSheet

**Goal**: Confirm the bottom sheet wrapper works, uses theme tokens, and has no blur.

**Steps**:
1. Render a test screen with a `Sari3BottomSheet` (snapPoints `['50%']`).
2. Programmatically open it.

**Expected**:
- Sheet slides up to 50% of screen height.
- Background color matches `theme.colors.surfaceElevated`.
- Border radius at top matches `theme.radii.extraLarge`.
- Handle is visible and styled (no blur or glass effect).
- Pan-down to close works.

**References**: [contracts/component-contracts.md §16](./contracts/component-contracts.md), spec FR-022, FR-026

---

## Scenario 9 — Approved Libraries Smoke Test

**Goal**: Confirm all 4 newly installed libraries are importable and functional.

**Steps / Expected**:

| Library | Test | Expected |
|---|---|---|
| `expo-haptics` | Call `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)` on button press | Device vibrates lightly; no error |
| `@shopify/flash-list` | Render `<FlashList data={[1,2,3]} renderItem={({item}) => <Text>{item}</Text>} estimatedItemSize={50} />` | List renders 3 items; no runtime error |
| `lucide-react-native` | `import { Search } from 'lucide-react-native'` and render `<Search size={24} />` | Icon renders; no error |
| `@gorhom/bottom-sheet` | Render via `Sari3BottomSheet` (see Scenario 8) | Sheet renders and animates |

**References**: spec FR-023–FR-028, research D-005–D-007

---

## Scenario 10 — No Business Logic Leakage

**Goal**: Confirm zero business-logic imports exist in the shared UI layer.

**Steps**:
1. Run: `grep -r "supabase\|useQuery\|useMutation\|useAppDispatch\|useAppSelector\|createSlice\|auth.uid\|order_items" src/shared/ui/ --include="*.ts" --include="*.tsx"`

**Expected**:
- Zero matches. Any match is a critical violation.

**References**: spec FR-031, Constitution Principle II–III

---

## Scenario 11 — Existing Screens Unbroken

**Goal**: Confirm no existing feature screens regressed.

**Steps**:
1. Navigate through: Home screen (store list), store detail, auth (login/register), order flow, driver available orders.

**Expected**:
- All screens render without crash.
- Business logic (cart, orders, auth) behaves identically to before this feature.
- No `undefined` token errors in console.

**References**: spec FR-032, FR-035, Constitution Principle II

---

## Token Zero-Hardcode Audit

Run these greps to confirm no raw hex values remain in the shared UI layer:

```bash
# Should return zero results in src/shared/ui/
grep -r "#[0-9A-Fa-f]\{3,6\}" src/shared/ui/components/ --include="*.tsx" --include="*.ts"

# Exception: colors.ts itself (raw palette — expected)
# All other files must resolve colors through useTheme() or theme tokens only
```
