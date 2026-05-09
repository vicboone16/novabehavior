/**
 * Domain routing helpers.
 * 
 * - novabehavior.com (apex/www) is the canonical app host, served at /data
 * - data.novabehavior.com is legacy: only /login is kept; everything else
 *   redirects to https://novabehavior.com/data{path}
 */

export const APEX_HOST = 'novabehavior.com';
export const APEX_HOST_WWW = 'www.novabehavior.com';
export const LEGACY_DATA_HOST = 'data.novabehavior.com';

/** True when current host is the canonical apex (novabehavior.com or www). */
export function isApexHost(host: string = window.location.hostname): boolean {
  return host === APEX_HOST || host === APEX_HOST_WWW;
}

/** True when current host is the legacy data subdomain. */
export function isLegacyDataHost(host: string = window.location.hostname): boolean {
  return host === LEGACY_DATA_HOST;
}

/**
 * Router basename for BrowserRouter.
 * On the apex domain the app lives under /data; everywhere else it lives at root.
 */
export function getRouterBasename(host: string = window.location.hostname): string {
  return isApexHost(host) ? '/data' : '/';
}
