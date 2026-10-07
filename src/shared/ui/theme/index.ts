import { lightColors, darkColors, ColorTokens } from './colors';
import { typography, TypographyTokens, TypographyVariant, FontFamily } from './typography';
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

export type {
  ColorTokens,
  TypographyTokens,
  TypographyVariant,
  SpacingScale,
  RadiiTokens,
  ShadowTokens,
  MotionTokens,
};
export { lightColors, darkColors, typography, FontFamily, spacing, radii, shadows, motion };
export { useColors } from '../hooks/useColors';
export { useTheme } from '../context/ThemeContext';
