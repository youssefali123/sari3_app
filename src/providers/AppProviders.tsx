import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/shared/lib/store';
import { queryClient } from '@/shared/lib/queryClient';
import { AuthProvider } from '@/features/auth/application/context/AuthContext';
import { ThemeProvider } from '@/shared/ui/context/ThemeContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Composes all global providers. Nesting order (feature 009 T014):
 * ThemeProvider (outermost) > SafeAreaProvider > Redux Provider >
 * QueryClientProvider > AuthProvider. GestureHandlerRootView wraps
 * everything so gesture-based components work app-wide.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <QueryClientProvider client={queryClient}>
              <AuthProvider queryClient={queryClient}>{children}</AuthProvider>
            </QueryClientProvider>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
