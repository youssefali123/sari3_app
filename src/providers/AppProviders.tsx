import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/shared/lib/store';
import { queryClient } from '@/shared/lib/queryClient';
import { AuthProvider } from '@/features/auth/application/context/AuthContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Composes all global providers. Nesting order matters: the AuthProvider sits
 * inside QueryClientProvider so sign-out can purge the server-state cache.
 * Server state is owned by TanStack Query; client-local cart state by Redux;
 * the auth session by AuthContext.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider queryClient={queryClient}>{children}</AuthProvider>
        </QueryClientProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
