/**
 * Demo Mode Context — manages global demo mode state.
 * When active, the app shows demo data and disables real data actions.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface DemoModeContextValue {
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  toggleDemoMode: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'nova-demo-mode';

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  const enterDemoMode = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsDemoMode(true);
  }, []);

  const exitDemoMode = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsDemoMode(false);
  }, []);

  const toggleDemoMode = useCallback(() => {
    if (isDemoMode) exitDemoMode();
    else enterDemoMode();
  }, [isDemoMode, enterDemoMode, exitDemoMode]);

  return (
    <DemoModeContext.Provider value={{ isDemoMode, enterDemoMode, exitDemoMode, toggleDemoMode }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const ctx = useContext(DemoModeContext);
  if (!ctx) throw new Error('useDemoMode must be used within DemoModeProvider');
  return ctx;
}
