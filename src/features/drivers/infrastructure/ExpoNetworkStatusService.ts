import * as ExpoNetwork from 'expo-network';
import {
  NetworkStatus,
  NetworkStatusService,
} from '../domain/services/NetworkStatusService';

/**
 * expo-network-backed connectivity checks. Infrastructure detail only — the
 * domain interface stays free of Expo imports (Principle III).
 */
export class ExpoNetworkStatusService implements NetworkStatusService {
  async getNetworkStatus(): Promise<NetworkStatus> {
    const state = await ExpoNetwork.getNetworkStateAsync();
    return {
      isConnected: Boolean(state.isConnected),
      isInternetReachable: state.isInternetReachable ?? null,
    };
  }

  subscribeToNetworkStatus(
    onStatusChange: (status: NetworkStatus) => void,
  ): () => void {
    const subscription = ExpoNetwork.addNetworkStateListener((state) => {
      onStatusChange({
        isConnected: Boolean(state.isConnected),
        isInternetReachable: state.isInternetReachable ?? null,
      });
    });

    return () => {
      subscription.remove();
    };
  }
}
