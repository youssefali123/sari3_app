import { useEffect, useState } from 'react';
import {
  NetworkStatus,
  NetworkStatusService,
} from '../../domain/services/NetworkStatusService';
import { ExpoNetworkStatusService } from '../../infrastructure/ExpoNetworkStatusService';

const networkStatusService: NetworkStatusService =
  new ExpoNetworkStatusService();

/**
 * Reactive online/offline state for driver screens. Backed by expo-network;
 * starts optimistic (online) until the first real check resolves, since
 * blocking the UI on connectivity would freeze every screen.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
  });

  useEffect(() => {
    let mounted = true;

    networkStatusService
      .getNetworkStatus()
      .then((initial) => {
        if (mounted) setStatus(initial);
      })
      .catch(() => {
        // Keep optimistic online state on a failed probe; the listener below
        // will correct it on the next connectivity event.
      });

    const unsubscribe = networkStatusService.subscribeToNetworkStatus(
      (next) => {
        if (mounted) setStatus(next);
      },
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return status;
}
