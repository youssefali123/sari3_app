import { ViewStyle } from 'react-native';

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

/**
 * Subtle elevation levels (feature 009) — no large dark shadows.
 * `low` for cards, `medium` for raised elements, `high` for modals/sheets.
 */
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

/** Convenience: spreadable style for a given elevation level. */
export type ShadowStyle = ElevationLevel & Pick<ViewStyle, 'shadowColor'>;
