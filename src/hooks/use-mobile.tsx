import * as React from "react";
import { useMobilePreference } from "./useMobilePreference";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const { preference } = useMobilePreference();
  const [isDeviceMobile, setIsDeviceMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsDeviceMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsDeviceMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // Respect user preference over device detection
  if (preference === 'mobile') return true;
  if (preference === 'desktop') return false;
  return !!isDeviceMobile;
}

// Helper to check if device is actually mobile (ignoring preference)
export function useIsDeviceMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
