# Contract: UI Component API Surface (009-ui-design-foundation)

**Feature**: `009-ui-design-foundation`
**Date**: 2026-09-28

> These are the public-facing prop APIs for each shared UI component. All components live in `src/shared/ui/components/`. All consume the active theme via `useTheme()` internally.

---

## 1. `Button`

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'inverted' | 'ghost' | 'destructive';
type ButtonSize    = 'small' | 'medium' | 'large';

interface ButtonProps {
  variant?:     ButtonVariant;       // default: 'primary'
  size?:        ButtonSize;          // default: 'medium'
  label:        string;              // required — button text
  onPress:      () => void;
  disabled?:    boolean;             // default: false
  loading?:     boolean;             // shows spinner, disables press
  icon?:        React.ReactNode;     // any React element (e.g., <Icon name="..." />)
  iconPosition?: 'left' | 'right';  // default: 'left'; RTL-aware (auto-mirrors)
  fullWidth?:   boolean;             // default: false
  accessibilityLabel?: string;       // defaults to label
  testID?:      string;
}
```

**Touch target**: min height enforced at 44pt for small/medium/large.

---

## 2. `Card`

```typescript
type CardVariant = 'default' | 'elevated' | 'outlined' | 'flat';

interface CardProps {
  variant?:  CardVariant;           // default: 'default'
  children:  React.ReactNode;
  style?:    ViewStyle;
  onPress?:  () => void;            // if provided, card is pressable
  testID?:   string;
}
```

**Token usage**: background → `theme.colors.surface`; elevated → `theme.shadows.low`; outlined → `theme.colors.border`; flat → no shadow, no border.

---

## 3. `Text`

```typescript
type TypographyVariant = 'display' | 'headingLarge' | 'headingMedium' | 'headingSmall'
  | 'bodyLarge' | 'bodyMedium' | 'bodySmall' | 'caption' | 'label' | 'button' | 'price' | 'numeric';

interface SariTextProps {
  variant?:        TypographyVariant;     // default: 'bodyMedium'
  color?:          keyof ColorTokens;    // token key, resolved from active theme
  align?:          'left' | 'center' | 'right' | 'auto';
  numberOfLines?:  number;
  children:        React.ReactNode;
  accessibilityRole?: AccessibilityRole;
  style?:          TextStyle;
  testID?:         string;
}
```

---

## 4. `Input`

```typescript
interface InputProps {
  label?:          string;
  placeholder?:    string;
  value:           string;
  onChangeText:    (text: string) => void;
  error?:          string;           // error message shown below input
  disabled?:       boolean;
  leadingIcon?:    React.ReactNode;
  trailingAction?: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?:   KeyboardTypeOptions;
  returnKeyType?:  ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  accessibilityLabel?: string;
  testID?:         string;
  // RTL is handled internally via I18nManager
}
```

---

## 5. `Icon`

```typescript
type IconName = string; // Lucide icon name (e.g., 'ChevronRight', 'Search', 'ShoppingCart')

// Directional icons (auto-mirrored in RTL)
const RTL_DIRECTIONAL_ICONS = [
  'ChevronLeft', 'ChevronRight', 'ArrowLeft', 'ArrowRight',
  'MoveLeft', 'MoveRight', 'SkipBack', 'SkipForward',
] as const;

interface IconProps {
  name:               IconName;
  size?:              number;           // default: 24
  color?:             string;           // default: theme.colors.textPrimary
  accessibilityLabel?: string;          // screen reader label
  accessibilityHidden?: boolean;        // true for decorative icons
  testID?:            string;
}
```

---

## 6. `Badge`

```typescript
type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label:     string;
  variant?:  BadgeVariant;   // default: 'neutral'
  size?:     'small' | 'medium';
}
```

---

## 7. `Chip`

```typescript
interface ChipProps {
  label:      string;
  selected?:  boolean;
  onPress?:   () => void;
  icon?:      React.ReactNode;
  disabled?:  boolean;
}
```

---

## 8. `Divider`

```typescript
interface DividerProps {
  orientation?: 'horizontal' | 'vertical';   // default: 'horizontal'
  spacing?:     'none' | 'sm' | 'md' | 'lg'; // vertical margin around horizontal divider
  color?:       string;                       // default: theme.colors.divider
}
```

---

## 9. `Avatar`

```typescript
interface AvatarProps {
  source?:    ImageSourcePropType;
  initials?:  string;     // shown when no image (e.g., "YA")
  size?:      'small' | 'medium' | 'large';   // 32 / 44 / 64
  accessibilityLabel?: string;
}
```

---

## 10. `SearchBar` (shared primitive — distinct from `features/search/SearchBar`)

```typescript
interface SearchBarProps {
  value:         string;
  onChangeText:  (text: string) => void;
  placeholder?:  string;     // default: "Search..."
  onClear?:      () => void; // shows clear button when value non-empty
  onSubmit?:     () => void;
  disabled?:     boolean;
  accessibilityLabel?: string;
  testID?:       string;
}
```

---

## 11. `QuantitySelector`

```typescript
interface QuantitySelectorProps {
  quantity:     number;
  onIncrement:  () => void;
  onDecrement:  () => void;
  min?:         number;   // default: 1
  max?:         number;   // default: 99
  disabled?:    boolean;
}
```

---

## 12. `SectionHeader`

```typescript
interface SectionHeaderProps {
  title:      string;
  action?:    { label: string; onPress: () => void };
  style?:     ViewStyle;
}
```

---

## 13. `LoadingState` (extends existing `LoadingSpinner`)

```typescript
interface LoadingStateProps {
  size?:     'small' | 'large';   // default: 'large'
  color?:    string;               // default: theme.colors.primary
  fullPage?: boolean;              // centers spinner in flex:1 container
}
```

---

## 14. `EmptyState` (extends existing)

```typescript
interface EmptyStateProps {
  icon?:     React.ReactNode;
  title:     string;
  message?:  string;
  action?:   { label: string; onPress: () => void };
}
```

---

## 15. `ErrorState` (consolidates existing `ErrorView`)

```typescript
interface ErrorStateProps {
  title?:    string;       // default: "Something went wrong"
  message?:  string;
  onRetry?:  () => void;
  fullPage?: boolean;
}
```

---

## 16. `Sari3BottomSheet`

```typescript
interface Sari3BottomSheetProps {
  snapPoints:     (string | number)[];  // e.g., ['50%', '90%']
  children:       React.ReactNode;
  onClose?:       () => void;
  enablePanDownToClose?: boolean;        // default: true
  accessibilityLabel?:   string;
  testID?:               string;
  // Theme, radius, handle, background are applied internally from useTheme()
}

// Usage: always pass a ref for programmatic open/close
// ref: React.RefObject<BottomSheetMethods>
```

---

## 17. `useTheme` Hook

```typescript
// src/shared/ui/context/ThemeContext.tsx
function useTheme(): {
  theme:       Theme;
  isDark:      boolean;
  setDark:     (dark: boolean) => void;
  toggleTheme: () => void;
}
```

Throws a `Error('useTheme must be used inside ThemeProvider')` in development if called outside a `ThemeProvider` ancestor.
