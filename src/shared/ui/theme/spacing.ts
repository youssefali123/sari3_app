/**
 * Spacing scale (feature 009). Border radius tokens moved to `radii.ts` —
 * a deprecated legacy re-export lives at the bottom of this file so existing
 * `import { borderRadius } from '@/shared/ui/theme/spacing'` call sites keep
 * working during migration.
 */
import { borderRadius } from './radii';

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

/**
 * @deprecated Legacy radius map — use `radii` from `./radii` (or
 * `theme.radii` via useTheme) in all NEW code. Re-exported here only so
 * existing call sites keep compiling.
 */
export { borderRadius };
