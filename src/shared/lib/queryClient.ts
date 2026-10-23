import { QueryClient, onlineManager, focusManager } from '@tanstack/react-query';
import { AppState, Platform, AppStateStatus } from 'react-native';
import * as Network from 'expo-network';

// Wire onlineManager to device connectivity signal via expo-network (FR-004)
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    // If isInternetReachable is null or undefined, treat unknown as online (spec edge cases)
    const isOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;
    setOnline(isOnline);
  });

  return () => {
    subscription.remove();
  };
});

// Wire focusManager to AppState for foreground refetching on mobile platforms (FR-004)
function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

AppState.addEventListener('change', onAppStateChange);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true, // FR-005: refetch stale queries when app foregrounds
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0, // FR-024: mutations must not auto-retry
      networkMode: 'always', // FR-006: writes execute immediately and fail fast
    },
  },
});
