import { useCallback, useEffect, useState } from 'react';

/**
 * A countdown in whole seconds ("Resend in 42 s"). `start()` begins it; `remaining` is 0 when the
 * action is allowed again.
 */
export function useCooldown(seconds: number): { remaining: number; start: () => void } {
  const [until, setUntil] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (until === null) return undefined;
    const tick = () => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setUntil(null);
    };
    const timer = window.setInterval(tick, 250);
    const first = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(first);
    };
  }, [until]);

  const start = useCallback(() => {
    setRemaining(seconds);
    setUntil(Date.now() + seconds * 1000);
  }, [seconds]);

  return { remaining, start };
}
