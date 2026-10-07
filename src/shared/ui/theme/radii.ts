/**
 * Border radius tokens (feature 009). Canonical source — `spacing.ts`
 * re-exports a deprecated legacy alias for existing call sites.
 */
export interface RadiiTokens {
  none:       number;
  small:      number;
  medium:     number;
  large:      number;
  extraLarge: number;
  base:       number;
  button:     number;
  card:       number;
  tile:       number;
  banner:     number;
  pill:       number;
}

export const radii: RadiiTokens = {
  none:       0,
  small:      4,
  medium:     8,
  large:      12,
  extraLarge: 20,
  base:       18,
  button:     16,
  card:       20,
  tile:       20,
  banner:     24,
  pill:       9999,
};

/**
 * @deprecated Legacy radius map — use `radii` in all NEW code. Keys kept for
 * existing call sites (sm/md/lg/xl/full).
 */
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;
