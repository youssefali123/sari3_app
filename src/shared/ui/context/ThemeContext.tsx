import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme } from '../theme/theme';

export type ThemeMode = 'light' | 'dark';
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = '@sari3_theme_preference';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Theme provider with support for:
 * - 'system': dynamically tracks the OS color scheme
 * - 'light': forces light theme
 * - 'dark': forces dark theme
 *
 * User preference is persisted across restarts via AsyncStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');

  // Rehydrate persisted theme preference on app launch
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setThemePreferenceState(stored);
        }
      })
      .catch((error) => {
        console.warn('[ThemeContext] Failed to load theme preference:', error);
      });
  }, []);

  const setThemePreference = async (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    try {
      if (preference === 'system') {
        await AsyncStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
      }
    } catch (error) {
      console.warn('[ThemeContext] Failed to save theme preference:', error);
    }
  };

  const isDark =
    themePreference === 'system'
      ? systemScheme === 'dark'
      : themePreference === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark,
      themePreference,
      setThemePreference,
    }),
    [theme, isDark, themePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Access the active theme. Throws a dev-visible error when used outside a
 * ThemeProvider so wiring mistakes surface immediately.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error(
      'useTheme must be used within a ThemeProvider — wrap your app with <ThemeProvider>.',
    );
  }
  return context;
}
