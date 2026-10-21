import type { ReactNode } from 'react';

import { useAuth } from '@/hooks/use-auth';

import { SignedInNotice } from './signed-in-notice';
import { UnavailableNotice } from './unavailable-notice';

/**
 * The sign-in and sign-up forms, or what replaces them: the unavailable notice when the build has
 * no Supabase settings, and "You are signed in" for someone who already is.
 */
export function AuthGate({ target, children }: { target: string; children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'unavailable') return <UnavailableNotice />;
  if (status === 'signed-in' && user) return <SignedInNotice user={user} target={target} />;
  return <>{children}</>;
}
