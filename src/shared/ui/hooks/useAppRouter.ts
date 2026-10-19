import { useCallback, useMemo, useRef } from 'react';
import { router as expoRouter, useRouter as useExpoRouter } from 'expo-router';

/** Default window in ms during which duplicate push/navigate calls are discarded. */
const DEFAULT_THROTTLE_MS = 500;

// Module-level timestamp to prevent rapid double-clicks across all components/instances
let globalLastNavTime = 0;

/**
 * Returns true if navigation is allowed, or false if a navigation event
 * happened too recently (within throttle window).
 */
export function isNavigationAllowed(throttleMs: number = DEFAULT_THROTTLE_MS): boolean {
  const now = Date.now();
  if (now - globalLastNavTime < throttleMs) {
    return false;
  }
  globalLastNavTime = now;
  return true;
}

/**
 * Throttled router singleton for non-hook call sites (callbacks, actions).
 */
export const appRouter = {
  ...expoRouter,
  push: ((...args: Parameters<typeof expoRouter.push>) => {
    if (!isNavigationAllowed()) return;
    return expoRouter.push(...args);
  }) as typeof expoRouter.push,
  navigate: ((...args: Parameters<typeof expoRouter.navigate>) => {
    if (!isNavigationAllowed()) return;
    return expoRouter.navigate(...args);
  }) as typeof expoRouter.navigate,
};

/**
 * Drop-in replacement for Expo Router's `useRouter()`.
 * Protects against rapid double-taps that push duplicate screens onto the navigation stack.
 */
export function useAppRouter() {
  const router = useExpoRouter();
  const localLastNavTimeRef = useRef(0);

  const push = useCallback<typeof router.push>(
    (...args) => {
      const now = Date.now();
      if (
        now - globalLastNavTime < DEFAULT_THROTTLE_MS ||
        now - localLastNavTimeRef.current < DEFAULT_THROTTLE_MS
      ) {
        return;
      }
      globalLastNavTime = now;
      localLastNavTimeRef.current = now;
      return router.push(...args);
    },
    [router],
  );

  const navigate = useCallback<typeof router.navigate>(
    (...args) => {
      const now = Date.now();
      if (
        now - globalLastNavTime < DEFAULT_THROTTLE_MS ||
        now - localLastNavTimeRef.current < DEFAULT_THROTTLE_MS
      ) {
        return;
      }
      globalLastNavTime = now;
      localLastNavTimeRef.current = now;
      return router.navigate(...args);
    },
    [router],
  );

  return useMemo(
    () => ({
      ...router,
      push,
      navigate,
    }),
    [router, push, navigate],
  );
}
