import { useEffect, useRef } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { type AuthStatus, browserSessionStorage, guardRedirect } from '@/lib/supabase';

export interface RequireAuthOptions {
  /**
   * Where to go when the visitor signs out on this page (the account menu, a sign-out button):
   * default `/`. Only a visitor who arrives signed out is sent to the sign-in page.
   */
  afterSignOut?: string;
}

/**
 * The route guard for pages that need a session (/settings/): once the auth state is known, a
 * signed-out visitor is sent to `/login/?redirect=<this page>` (with the legacy loop guard, see
 * lib/supabase/guard.ts). Signing out while on the page goes to `afterSignOut` instead. Returns
 * the status so the page can render its loading state meanwhile.
 */
export function useRequireAuth({ afterSignOut = '/' }: RequireAuthOptions = {}): AuthStatus {
  const { status } = useAuth();
  const wasSignedIn = useRef(false);
  useEffect(() => {
    if (status === 'signed-in') wasSignedIn.current = true;
    if (status === 'signed-out' && wasSignedIn.current) {
      window.location.replace(afterSignOut);
      return;
    }
    const target = guardRedirect(
      status,
      window.location,
      window.location.origin,
      browserSessionStorage(),
    );
    if (target) window.location.replace(target);
  }, [status, afterSignOut]);
  return status;
}
