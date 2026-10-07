# Data Model: UI Design System & Foundation (009)

**Feature**: `009-ui-design-foundation`
**Date**: 2026-09-28

---

## 1. Theme Token Schemas (TypeScript)

### 1.1 Color Tokens

**File**: `src/shared/ui/theme/colors.ts`

```typescript
// Raw palette (internal — not exported for direct consumer use)
const palette = {
  // Primary (Sari3 brand gold)
  primary50:  '#FFF8E1',
  primary100: '#FFEDB2',
  primary200: '#FFE082',
  primary300: '#FFD54F',
  primary400: '#FFCA28',
  primary500: '#FFB800',  // ← base brand primary
  primary600: '#CC9400',  // ← WCAG AA on white (4.6:1) — use for filled button backgrounds
  primary700: '#A07000',

  // Secondary (near-black)
  secondary900: '#1A1A1A',
  secondary800: '#2C2C2C',
  secondary700: '#3D3D3D',

  // Success (green)
  success500: '#27AE60',
  success100: '#D5F0E0',

  // Warning
  warning500: '#F39C12',
  warning100: '#FEF3CD',

  // Error
  error500: '#E74C3C',
  error100: '#FDDEDE',

  // Info
  info500:  '#3498DB',
  info100:  '#D6EAF8',

  // Neutrals
  neutral50:  '#F8F9FA',  // ← brand neutral/background
  neutral100: '#F1F3F5',
  neutral200: '#E9ECEF',
  neutral300: '#DEE2E6',
  neutral400: '#CED4DA',
  neutral500: '#ADB5BD',
  neutral600: '#6C757D',
  neutral700: '#495057',
  neutral800: '#343A40',
  neutral900: '#212529',

  white: '#FFFFFF',
  black: '#000000',
} as const;

// Semantic token interface — both themes must implement all fields
export interface ColorTokens {
  primary:          string;
  primaryPressed:   string;   // pressed/active state of primary
  primaryDisabled:  string;   // disabled primary tint
  primarySubtle:    string;   // low-emphasis tint (badge backgrounds, etc.)
  secondary:        string;
  success:          string;
  successSubtle:    string;
  warning:          string;
  warningSubtle:    string;
  error:            string;
  errorSubtle:      string;
  info:             string;
  infoSubtle:       string;
  background:       string;   // screen/page background
  surface:          string;   // card/component surface
  surfaceElevated:  string;   // modal, bottom sheet surface
  textPrimary:      string;
  textSecondary:    string;
  textMuted:        string;
  textInverse:      string;   // text on primary/dark backgrounds
  textDisabled:     string;
  border:           string;
  divider:          string;
  disabled:         string;   // disabled component background
  overlay:          string;   // scrim / backdrop
}

export const lightColors: ColorTokens = {
  primary:          palette.primary500,    // #FFB800
  primaryPressed:   palette.primary600,    // #CC9400
  primaryDisabled:  palette.primary200,    // #FFE082
  primarySubtle:    palette.primary50,     // #FFF8E1
  secondary:        palette.secondary900,  // #1A1A1A
  success:          palette.success500,    // #27AE60
  successSubtle:    palette.success100,
  warning:          palette.warning500,
  warningSubtle:    palette.warning100,
  error:            palette.error500,
  errorSubtle:      palette.error100,
  info:             palette.info500,
  infoSubtle:       palette.info100,
  background:       palette.neutral50,     // #F8F9FA
  surface:          palette.white,
  surfaceElevated:  palette.white,
  textPrimary:      palette.neutral900,    // #212529
  textSecondary:    palette.neutral600,    // #6C757D
  textMuted:        palette.neutral500,    // #ADB5BD
  textInverse:      palette.white,
  textDisabled:     palette.neutral400,
  border:           palette.neutral300,    // #DEE2E6
  divider:          palette.neutral200,
  disabled:         palette.neutral200,
  overlay:          'rgba(0,0,0,0.5)',
};

export const darkColors: ColorTokens = {
  primary:          palette.primary500,    // brand stays recognizable
  primaryPressed:   palette.primary400,
  primaryDisabled:  palette.primary700,
  primarySubtle:    'rgba(255,184,0,0.12)',
  secondary:        palette.neutral200,
  success:          '#2ECC71',
  successSubtle:    'rgba(39,174,96,0.15)',
  warning:          '#F5A623',
  warningSubtle:    'rgba(243,156,18,0.15)',
  error:            '#FF6B6B',
  errorSubtle:      'rgba(231,76,60,0.15)',
  info:             '#5DADE2',
  infoSubtle:       'rgba(52,152,219,0.15)',
  background:       '#0D0D0D',
  surface:          '#1C1C1E',
  surfaceElevated:  '#2C2C2E',
  textPrimary:      '#F2F2F7',
  textSecondary:    '#AEAEB2',
  textMuted:        '#636366',
  textInverse:      palette.black,
  textDisabled:     '#48484A',
  border:           '#38383A',
  divider:          '#2C2C2E',
  disabled:         '#1C1C1E',
  overlay:          'rgba(0,0,0,0.7)',
};
```

---

### 1.2 Typography Tokens

**File**: `src/shared/ui/theme/typography.ts`

```typescript
import { TextStyle } from 'react-native';

export type TypographyVariant =
  | 'display'
  | 'headingLarge'
  | 'headingMedium'
  | 'headingSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'button'
  | 'price'
  | 'numeric';

// Font family names matching the loaded Tajawal font weights
export const FontFamily = {
  regular:  'Tajawal_400Regular',
  medium:   'Tajawal_500Medium',
  semiBold: 'Tajawal_600SemiBold',
  bold:     'Tajawal_700Bold',
} as const;

export type TypographyTokens = Record<TypographyVariant, TextStyle>;

export const typography: TypographyTokens = {
  display: {
    fontFamily: FontFamily.bold,
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  headingLarge: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  headingMedium: {
    fontFamily: FontFamily.semiBold,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
  },
  headingSmall: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  price: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  numeric: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
};
```

---

### 1.3 Spacing Tokens

**File**: `src/shared/ui/theme/spacing.ts` (borderRadius extracted to `radii.ts`)

```typescript
export type SpacingScale = {
  xxs: number;
  xs:  number;
  sm:  number;
  md:  number;
  lg:  number;
  xl:  number;
  xxl: number;
  xxxl: number;
};

export const spacing: SpacingScale = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
};
```

---

### 1.4 Border Radius Tokens

**File**: `src/shared/ui/theme/radii.ts` *(new file)*

```typescript
export interface RadiiTokens {
  none:       number;
  small:      number;
  medium:     number;
  large:      number;
  extraLarge: number;
  pill:       number;
}

export const radii: RadiiTokens = {
  none:       0,
  small:      4,
  medium:     8,
  large:      12,
  extraLarge: 20,
  pill:       9999,
};
```

---

### 1.5 Elevation / Shadow Tokens

**File**: `src/shared/ui/theme/shadows.ts` *(new file)*

```typescript
import { ShadowStyleIOS, ViewStyle } from 'react-native';

export interface ElevationLevel {
  shadowColor:   string;
  shadowOffset:  { width: number; height: number };
  shadowOpacity: number;
  shadowRadius:  number;
  elevation:     number;   // Android only
}

export interface ShadowTokens {
  none:   ElevationLevel;
  low:    ElevationLevel;
  medium: ElevationLevel;
  high:   ElevationLevel;
}

export const shadows: ShadowTokens = {
  none: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  high: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

---

### 1.6 Motion Tokens

**File**: `src/shared/ui/theme/motion.ts` *(new file)*

```typescript
export interface MotionTokens {
  // Durations (ms) — used as Reanimated `withTiming` duration values
  durationFast:   number;
  durationNormal: number;
  durationSlow:   number;

  // Easing curves — standard cubic bezier string representations
  easingStandard:    string;   // Default transitions
  easingEmphasized:  string;   // Expand / hero transitions
  easingDecelerated: string;   // Enter-screen motion
  easingAccelerated: string;   // Exit-screen motion
}

export const motion: MotionTokens = {
  durationFast:   150,
  durationNormal: 250,
  durationSlow:   400,

  easingStandard:    'cubic-bezier(0.4, 0.0, 0.2, 1.0)',
  easingEmphasized:  'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
  easingDecelerated: 'cubic-bezier(0.0, 0.0, 0.2, 1.0)',
  easingAccelerated: 'cubic-bezier(0.4, 0.0, 1.0, 1.0)',
};
```

---

### 1.7 Theme Barrel Export

**File**: `src/shared/ui/theme/index.ts` *(new file)*

```typescript
import { lightColors, darkColors, ColorTokens } from './colors';
import { typography, TypographyTokens, TypographyVariant } from './typography';
import { spacing, SpacingScale } from './spacing';
import { radii, RadiiTokens } from './radii';
import { shadows, ShadowTokens } from './shadows';
import { motion, MotionTokens } from './motion';

export interface Theme {
  colors:     ColorTokens;
  typography: TypographyTokens;
  spacing:    SpacingScale;
  radii:      RadiiTokens;
  shadows:    ShadowTokens;
  motion:     MotionTokens;
}

export const lightTheme: Theme = {
  colors:     lightColors,
  typography,
  spacing,
  radii,
  shadows,
  motion,
};

export const darkTheme: Theme = {
  colors:     darkColors,
  typography,
  spacing,
  radii,
  shadows,
  motion,
};

export type { ColorTokens, TypographyTokens, TypographyVariant, SpacingScale, RadiiTokens, ShadowTokens, MotionTokens };
export { lightColors, darkColors };
```

---

## 2. ThemeContext Entity

**File**: `src/shared/ui/context/ThemeContext.tsx`

```typescript
interface ThemeContextValue {
  theme:       Theme;       // active resolved theme object
  isDark:      boolean;
  setDark:     (dark: boolean) => void;
  toggleTheme: () => void;
}
```

- Initial mode: system preference via `useColorScheme()` (React Native built-in), overridable by user preference stored in `AsyncStorage`.
- Key: `@sari3/theme-mode` (`'light'` | `'dark'`).
- Provider is memoized: `theme` value object reference only changes when the mode actually toggles.

---

## 3. Component Entity Relationships

```
Theme (lightTheme | darkTheme)
  └── consumed by all shared UI components via useTheme()

shared/ui/components/
  ├── Text          → theme.colors.textPrimary / textSecondary / etc.
  │                   theme.typography.*
  ├── Button        → theme.colors.primary / primaryPressed / disabled
  │                   theme.spacing.* / radii.* / typography.button
  ├── Card          → theme.colors.surface / surfaceElevated / border
  │                   theme.shadows.low / medium / radii.medium
  ├── Input         → theme.colors.border / error / background / text*
  │                   theme.spacing.* / radii.medium / typography.bodyMedium
  ├── Badge         → theme.colors.primary / success / error / info
  ├── Chip          → theme.colors.surface / border / primary
  ├── Icon          → size (number), color (string from theme.colors.*)
  │                   RTL mirror for directional icons
  └── Sari3BottomSheet → theme.colors.surface / surfaceElevated
                         theme.radii.extraLarge / shadows.high
```
