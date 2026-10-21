import { useEffect, useState } from 'react';

import { type BreachResult, checkPwnedPassword, evaluatePassword } from '@/lib/supabase';

export type BreachState = { status: 'idle' | 'checking' } | BreachResult;

const DEBOUNCE_MS = 550;

/**
 * Runs the breach check (k-anonymity, lib/supabase/password.ts) once the password passes the
 * rules and the person stops typing for a moment. Older answers never overwrite newer ones.
 */
export function useBreachCheck(password: string): BreachState {
  const [result, setResult] = useState<{ password: string; state: BreachState } | null>(null);
  const eligible = evaluatePassword(password).ok;

  useEffect(() => {
    if (!eligible) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setResult({ password, state: { status: 'checking' } });
      void checkPwnedPassword(password, { signal: controller.signal }).then(state => {
        if (!controller.signal.aborted) setResult({ password, state });
      });
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [password, eligible]);

  if (!eligible) return { status: 'idle' };
  return result?.password === password ? result.state : { status: 'checking' };
}
