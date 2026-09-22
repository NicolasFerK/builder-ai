import * as React from "react";
import { useSettings } from "@/context/SettingsContext";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const { settings } = useSettings();
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener("resize", onChange);
    onChange();
    return () => window.removeEventListener("resize", onChange);
  }, []);

  // If viewMode is explicitly set, prioritize it.
  // Otherwise, use the detected device width.
  if (settings.viewMode === 'mobile') return true;
  if (settings.viewMode === 'desktop') return false;

  return !!isMobile;
}
