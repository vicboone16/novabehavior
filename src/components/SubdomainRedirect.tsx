import { useEffect } from 'react';
import { isLegacyDataHost } from '@/lib/domainRouting';

/**
 * If we're on data.novabehavior.com, redirect everything except /login (and its subpaths)
 * to the canonical novabehavior.com/data{path}. Mounted once near the top of the tree.
 */
export function SubdomainRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!isLegacyDataHost()) return;

    const { pathname, search, hash } = window.location;

    // Keep /login (and aliases /auth, /reset-password) on data.novabehavior.com so the
    // login page can live there per request.
    const keepOnLegacy = ['/login', '/auth', '/reset-password'];
    if (keepOnLegacy.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      return;
    }

    const target = `https://novabehavior.com/data${pathname === '/' ? '' : pathname}${search}${hash}`;
    window.location.replace(target);
  }, []);

  return null;
}
