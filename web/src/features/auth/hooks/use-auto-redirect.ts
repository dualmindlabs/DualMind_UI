import { useEffect, useState } from 'react';

import { goTo } from './use-redirect-target';

/**
 * Moves on to `target` after `seconds` (the callback page's "Taking you to the Arena"). Returns
 * the progress from 0 to 1 for the bar; nothing happens while `target` is null.
 */
export function useAutoRedirect(target: string | null, seconds: number): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (target === null) return undefined;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const passed = (Date.now() - startedAt) / 1000;
      setElapsed(passed);
      if (passed >= seconds) {
        window.clearInterval(timer);
        goTo(target);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [target, seconds]);

  return target === null ? 0 : Math.min(1, elapsed / seconds);
}
