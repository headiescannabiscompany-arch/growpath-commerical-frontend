/**
 * Navigation helpers for Phase 2.3.2
 * Expo Router typing compatibility layer
 */

/**
 * Safely push a route with parameters
 * Workaround for Expo Router strict typing when generated route types don't exist
 */
export function pushRoute(router: any, path: string, params?: Record<string, any>) {
  if (params) {
    router.push([path, params] as any);
  } else {
    router.push(path);
  }
}
