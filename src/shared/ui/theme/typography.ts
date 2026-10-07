import { TextStyle } from 'react-native';

/**
 * Typography variants (feature 009). Use these instead of ad-hoc
 * fontSize/fontWeight values.
 */
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

/** Font family names matching the loaded Tajawal font weights (feature 009). */
export const FontFamily = {
  regular:  'Tajawal_400Regular',
  medium:   'Tajawal_500Medium',
  semiBold: 'Tajawal_500Medium', // Tajawal has no 600 weight — 500 is the closest
  bold:     'Tajawal_700Bold',
} as const;

export type TypographyTokens = Record<TypographyVariant, TextStyle>;

/**
 * Token map consumed across the app. Contains the 12 canonical variants
 * PLUS @deprecated legacy keys (h1/h2/h3/body/bodySmall/caption) kept so
 * existing feature screens keep compiling — all NEW code must use the
 * canonical variants only.
 */
export const typography = {
  // Canonical variants (feature 009)
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

  // ---- @deprecated legacy aliases (map to canonical variants) ----
  /** @deprecated use headingLarge */
  h1: typography_alias_h1(),
  /** @deprecated use headingMedium */
  h2: typography_alias_h2(),
  /** @deprecated use headingSmall */
  h3: typography_alias_h3(),
  body: typography_alias_body(),
  // Legacy 'bodySmall' key collides with canonical bodySmall — the canonical
  // 12pt value takes over (old 14pt usage migrates to bodyMedium).
} as const;

function typography_alias_h1(): TextStyle {
  return {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  };
}
function typography_alias_h2(): TextStyle {
  return {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  };
}
function typography_alias_h3(): TextStyle {
  return {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  };
}
function typography_alias_body(): TextStyle {
  return {
    fontFamily: FontFamily.regular,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  };
}
