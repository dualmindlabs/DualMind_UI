import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A short "Saved" confirmation for settings that apply at once (theme, motion, arena options):
 * `flash()` shows it, and it hides itself after `ms`. Calling it again restarts the timer.
 */
export function useSavedFlash(ms = 2400): [visible: boolean, flash: () => void] {
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const flash = useCallback(() => {
    setVisible(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), ms);
  }, [ms]);

  useEffect(() => {
    const pending = timer;
    return () => window.clearTimeout(pending.current);
  }, []);

  return [visible, flash];
}
