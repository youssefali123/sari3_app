import { useContext } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { lightColors, darkColors, ColorTokens } from '../theme/colors';

/**
 * Hook providing current semantic ColorTokens.
 * Seamlessly resolves from active ThemeContext, with safe fallback to system scheme.
 */
export function useColors(): ColorTokens {
  const context = useContext(ThemeContext);
  const scheme = useColorScheme();

  if (context?.theme?.colors) {
    return context.theme.colors;
  }
  return scheme === 'dark' ? darkColors : lightColors;
}
