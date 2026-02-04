import { useState, useEffect, useCallback } from 'react';

export type MobilePreference = 'auto' | 'mobile' | 'desktop';

const STORAGE_KEY = 'mobilePreference';

export function useMobilePreference() {
  const [preference, setPreferenceState] = useState<MobilePreference>(() => {
    if (typeof window === 'undefined') return 'auto';
    return (localStorage.getItem(STORAGE_KEY) as MobilePreference) || 'auto';
  });

  const setMobilePreference = useCallback((pref: MobilePreference) => {
    localStorage.setItem(STORAGE_KEY, pref);
    setPreferenceState(pref);
  }, []);

  // Sync with other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        setPreferenceState(e.newValue as MobilePreference);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return { preference, setMobilePreference };
}
