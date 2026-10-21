import type { User } from '@supabase/supabase-js';
import { ArrowRight, UserRound } from 'lucide-react';
import { useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

/** Who is signed in: an email, a phone number, or a fallback. */
export function accountLabel(user: Pick<User, 'email' | 'phone'>): string {
  return user.email || (user.phone ? `+${user.phone.replace(/^\+/, '')}` : 'your account');
}

/**
 * On the login and sign-up pages for someone who is already signed in: continue to where they
 * were going, or sign out (which also clears the offline vote queue and the legacy keys).
 */
export function SignedInNotice({ user, target }: { user: User; target: string }) {
  const { signOut } = useAuth();
  const [pending, setPending] = useState(false);
  return (
    <section className="grid gap-4 rounded-lg border border-line bg-surface p-5 shadow-raise">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-mind-a"
        >
          <UserRound className="size-4.5" />
        </span>
        <div className="grid gap-1 pt-1">
          <h2 className="text-ui font-medium text-fg">You are signed in</h2>
          <p className="text-ui-sm break-all text-fg-soft">{accountLabel(user)}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={target} className={buttonVariants({ variant: 'primary' })}>
          Continue
          <ArrowRight aria-hidden="true" />
        </a>
        <Button
          variant="secondary"
          loading={pending}
          onClick={() => {
            setPending(true);
            void signOut().finally(() => setPending(false));
          }}
        >
          Sign out
        </Button>
      </div>
    </section>
  );
}
