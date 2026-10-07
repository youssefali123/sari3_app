/**
 * Raw palette (internal — not exported for direct consumer use).
 * Feature 009: Sari3 brand gold replaces the previous blue primary.
 */
const palette = {
  // Primary (Sari3 brand gold)
  primary50:  '#FFF8E1',
  primary100: '#FFEDB2',
  primary200: '#FFE082',
  primary300: '#FFD54F',
  primary400: '#FFCA28',
  primary500: '#FFB800',  // ← base brand primary
  primary600: '#CC9400',  // ← WCAG AA on white (4.6:1) — filled button backgrounds
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

/**
 * Semantic token interface — both themes must implement all fields.
 * Consumers access colors ONLY through the active theme (lightTheme/darkTheme).
 */
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

  // Rich semantic tokens transferred from SOURCE (delivery-app)
  text:                 string;
  tint:                 string;
  foreground:           string;
  card:                 string;
  cardForeground:       string;
  primaryForeground:    string;
  secondaryForeground:  string;
  muted:                string;
  mutedForeground:      string;
  accent:               string;
  accentForeground:     string;
  destructive:          string;
  destructiveForeground:string;
  input:                string;
}

export const lightColors: ColorTokens = {
  primary:          '#f5bd16',    // Brand gold
  primaryPressed:   '#dfa90c',    // Pressed state
  primaryDisabled:  palette.primary200,    // #FFE082
  primarySubtle:    '#fff2d1',    // Low-emphasis gold tint
  secondary:        '#edf4ef',    // Subtle sage mint
  success:          palette.success500,    // #27AE60
  successSubtle:    palette.success100,
  warning:          palette.warning500,
  warningSubtle:    palette.warning100,
  error:            '#c94f48',
  errorSubtle:      palette.error100,
  info:             palette.info500,       // #3498DB
  infoSubtle:       palette.info100,
  background:       '#fbfaf6',    // Warm eggshell paper
  surface:          palette.white,
  surfaceElevated:  palette.white,
  textPrimary:      '#191816',
  textSecondary:    '#77746d',
  textMuted:        '#8c8880',
  textInverse:      palette.white,
  textDisabled:     palette.neutral400,
  border:           '#eeece5',
  divider:          '#eeece5',
  disabled:         '#f4f1e8',
  overlay:          'rgba(0,0,0,0.5)',

  // SOURCE semantic tokens
  text:                 '#191816',
  tint:                 '#f5bd16',
  foreground:           '#191816',
  card:                 palette.white,
  cardForeground:       '#191816',
  primaryForeground:    '#191816',
  secondaryForeground:  '#234b37',
  muted:                '#f4f1e8',
  mutedForeground:      '#77746d',
  accent:               '#e9f2ec',
  accentForeground:     '#234b37',
  destructive:          '#c94f48',
  destructiveForeground:palette.white,
  input:                '#eeece5',
} satisfies ColorTokens;

export const darkColors: ColorTokens = {
  primary:          '#f5bd16',    // Brand gold
  primaryPressed:   '#dfa90c',
  primaryDisabled:  palette.primary700,
  primarySubtle:    'rgba(245,189,22,0.14)',
  secondary:        '#29352e',    // Deep sage
  success:          '#2ECC71',
  successSubtle:    'rgba(39,174,96,0.15)',
  warning:          '#F5A623',
  warningSubtle:    'rgba(243,156,18,0.15)',
  error:            '#c94f48',
  errorSubtle:      'rgba(201,79,72,0.15)',
  info:             '#5DADE2',
  infoSubtle:       'rgba(52,152,219,0.15)',
  background:       '#171715',    // Deep charcoal warm black
  surface:          '#24231f',
  surfaceElevated:  '#2c2b26',
  textPrimary:      '#f6f4ee',
  textSecondary:    '#b5b1a8',
  textMuted:        '#8c8880',
  textInverse:      palette.black,
  textDisabled:     '#48484A',
  border:           '#38362f',
  divider:          '#38362f',
  disabled:         '#2a2925',
  overlay:          'rgba(0,0,0,0.7)',

  // SOURCE semantic tokens
  text:                 '#f6f4ee',
  tint:                 '#f5bd16',
  foreground:           '#f6f4ee',
  card:                 '#24231f',
  cardForeground:       '#f6f4ee',
  primaryForeground:    '#191816',
  secondaryForeground:  '#d7e9dc',
  muted:                '#2a2925',
  mutedForeground:      '#b5b1a8',
  accent:               '#29352e',
  accentForeground:     '#d7e9dc',
  destructive:          '#c94f48',
  destructiveForeground:palette.white,
  input:                '#38362f',
} satisfies ColorTokens;

/**
 * @deprecated Legacy flat color map — kept so existing feature screens keep
 * compiling. All NEW shared UI components must consume `useTheme().colors`
 * instead. Do not extend this map.
 */
export const colors = {
  primary: palette.primary500,
  primaryLight: palette.primary300,
  primaryDark: palette.primary600,
  accent: palette.primary500,
  accentLight: palette.primary300,
  accentDark: palette.primary600,
  success: palette.success500,
  successLight: palette.success100,
  warning: palette.warning500,
  warningLight: palette.warning100,
  error: palette.error500,
  errorLight: palette.error100,
  white: palette.white,
  background: palette.neutral50,
  surface: palette.white,
  border: palette.neutral300,
  textPrimary: palette.neutral900,
  textSecondary: palette.neutral600,
  textMuted: palette.neutral500,
  disabled: palette.neutral400,
  dark: {
    background: '#0D0D0D',
    surface: '#1C1C1E',
    border: '#38383A',
    textPrimary: '#F2F2F7',
    textSecondary: '#AEAEB2',
  },
} as const;
