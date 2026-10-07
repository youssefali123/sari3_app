import { useColorScheme } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { lightColors, darkColors, ColorTokens } from '../theme/colors';

/**
 * Hook providing current semantic ColorTokens.
 * Seamlessly resolves from active ThemeContext, with safe fallback to system scheme.
 */
export function useColors(): ColorTokens {
  try {
    const { theme } = useTheme();
    return theme.colors;
  } catch {
    const scheme = useColorScheme();
    return scheme === 'dark' ? darkColors : lightColors;
  }
}
