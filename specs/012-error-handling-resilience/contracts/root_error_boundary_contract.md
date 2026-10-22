# Contract: Root Error Boundary

**Feature Branch**: `012-error-handling-resilience`  
**Date**: 2026-10-22  
**Spec**: [specs/012-error-handling-resilience/spec.md](../spec.md)

---

## 1. Scope & Intent
Specifies the zero-dependency root error boundary exported from the root layout (`src/app/_layout.tsx`) following Expo Router conventions (FR-015, FR-016). Catches unhandled render crashes anywhere in the component tree and presents an Arabic recovery screen.

---

## 2. Interface Definition

```typescript
// Exported from src/app/_layout.tsx according to Expo Router conventions:
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> | void }): React.ReactElement;
```

---

## 3. Styling & Dependency Isolation Rules

1. **Zero External Providers**:
   - MUST NOT import or consume `useTheme`, `ThemeProvider`, `useAuth`, `AuthProvider`, `useSelector`, `useDispatch`, `useQuery`, or `useQueryClient`.
   - MUST NOT use custom fonts (`Tajawal_*`). Must use standard React Native system fonts (`Platform.select({ ios: 'System', android: 'sans-serif' })`).
2. **Safe Color Palette**:
   - Neutral dark canvas: `#1A1915`
   - High-contrast primary text: `#F6F4EE`
   - Secondary text: `#9E9B90`
   - Accent / Warning color: `#F5BD16`
   - Card background: `#24231F`
   - Border: `#38362F`
3. **Dual Arabic Recovery Actions**:
   - Primary Action: "إعادة المحاولة" (Retry)
     - Calls `props.retry()` to re-attempt rendering.
   - Secondary Action: "العودة للرئيسية" (Go to Home)
     - Calls `router.replace('/')` to reset boundary state and escape broken route.
4. **Developer Mode Diagnostics**:
   - If `__DEV__ === true`, render an expandable debug view below the recovery buttons with:
     - `error.name`
     - `error.message`
     - `error.stack`
