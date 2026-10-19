import { router } from 'expo-router';
import { UserRole } from '../../domain/entities/AuthUser';

/**
 * Post-authentication routing rules (T022):
 * - Drivers always land in the driver app, regardless of returnTo.
 * - Customers return to their intended destination when it is a customer
 *   route; otherwise the customer home.
 */
export function navigateAfterAuth(returnTo: string, role: UserRole | undefined): void {
  if (role === 'driver') {
    router.replace('/(driver)/available-orders');
    return;
  }
  if (
    returnTo &&
    (returnTo.startsWith('/(customer)/') ||
      returnTo === '/checkout' ||
      returnTo.startsWith('/checkout') ||
      returnTo.startsWith('/product/'))
  ) {
    router.replace(returnTo as never);
    return;
  }
  router.replace('/(customer)/(home)');
}
