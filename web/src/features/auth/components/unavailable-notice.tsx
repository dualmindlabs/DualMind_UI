import { PlugZap } from 'lucide-react';

import { NoticeCard } from './notice-card';

/**
 * Shown instead of the forms when the build has no Supabase settings: a clear dead end with a
 * way out, never a form that fails on submit.
 */
export function UnavailableNotice() {
  return (
    <NoticeCard icon={PlugZap} title="Sign-in is unavailable here">
      <p>
        This copy of DualMind Arena was built without its sign-in settings, so accounts cannot be
        used on it right now. The{' '}
        <a className="text-mind-a underline underline-offset-4" href="/leaderboard/">
          leaderboard
        </a>{' '}
        and the{' '}
        <a className="text-mind-a underline underline-offset-4" href="/models/">
          models
        </a>{' '}
        work without an account.
      </p>
      <p className="text-caption text-muted">
        Running the site? Set the build variables <code>VITE_SUPABASE_URL</code> and{' '}
        <code>VITE_SUPABASE_ANON_KEY</code>, then build again.
      </p>
    </NoticeCard>
  );
}
