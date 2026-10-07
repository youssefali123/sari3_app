import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, Theme } from '../theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Theme provider (feature 009 US2). The mode FOLLOWS the OS color scheme
 * live — `useColorScheme` re-renders when the device setting changes, so
 * the app always matches the phone.
 *
 * History: an earlier version persisted the mode to AsyncStorage, but the
 * persistence ran on every mode change — including the OS-derived initial
 * one — silently locking the app to whatever the system was at first launch
 * (reported: phone on light, app opening dark). Until the in-app toggle
 * ships (feature-pending), there is deliberately NO stored preference.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const mode: ThemeMode = systemScheme === 'dark' ? 'dark' : 'light';
  const isDark = mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isDark }),
    [theme, isDark],
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
