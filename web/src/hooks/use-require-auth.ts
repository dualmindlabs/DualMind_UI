import { useEffect } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { type AuthStatus, browserSessionStorage, guardRedirect } from '@/lib/supabase';

/**
 * The route guard for pages that need a session: once the auth state is known, a signed-out
 * visitor is sent to `/login/?redirect=<this page>` (with the legacy loop guard, see
 * lib/supabase/guard.ts). Returns the status so the page can render its loading state meanwhile.
 */
export function useRequireAuth(): AuthStatus {
  const { status } = useAuth();
  useEffect(() => {
    const target = guardRedirect(
      status,
      window.location,
      window.location.origin,
      browserSessionStorage(),
    );
    if (target) window.location.replace(target);
  }, [status]);
  return status;
}
