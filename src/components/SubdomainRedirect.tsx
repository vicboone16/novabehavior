import { useEffect } from 'react';
import { isLegacyDataHost } from '@/lib/domainRouting';

/**
 * Behavior on data.novabehavior.com:
 *  - "/"            → redirected to /welcome (public marketing page)
 *  - "/login"       → stays here, shows the Auth page
 *  - "/welcome/*"   → stays here (marketing pages)
 *  - "/privacy-policy", "/terms-and-conditions" → stay here (legal pages)
 *  - "/auth", "/reset-password" → stay here (auth aliases)
 *  - everything else (the authenticated app) → redirected to
 *    https://novabehavior.com/data{path}
 *
 * Mounted once near the top of the tree.
 */
export function SubdomainRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLegacyDataHost()) return;

    const { pathname, search, hash } = window.location;

    // Root on the legacy host should land on the public Welcome page.
    if (pathname === '/' || pathname === '') {
      window.location.replace(`/welcome${search}${hash}`);
      return;
    }

    // Public/auth pages and approved utility routes that should remain on
    // data.novabehavior.com.
    const keepExact = new Set<string>([
      '/login',
      '/auth',
      '/reset-password',
      '/privacy-policy',
      '/terms-and-conditions',
      '/admin/restored-behavior-cleanup',
    ]);
    const keepPrefixes = ['/welcome', '/login/', '/auth/', '/reset-password/'];

    if (keepExact.has(pathname)) return;
    if (keepPrefixes.some((p) => pathname.startsWith(p))) return;

    // Everything else (authenticated app surface) lives on the canonical apex
    // under the /data basename.
    const target = `https://novabehavior.com/data${pathname}${search}${hash}`;
    window.location.replace(target);
  }, []);

  return null;
}
