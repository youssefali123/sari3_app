import { Unsubscribe } from '../../../../shared/types/common';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

export interface NetworkStatusService {
  /**
   * Check current network connectivity asynchronously.
   */
  getNetworkStatus(): Promise<NetworkStatus>;

  /**
   * Listen for real-time network connectivity changes.
   */
  subscribeToNetworkStatus(
    onStatusChange: (status: NetworkStatus) => void,
  ): Unsubscribe;
}
