import type { User } from '@supabase/supabase-js';
import { LockKeyhole } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AccountMenu } from '@/features/arena';
import { useAuth } from '@/hooks/use-auth';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { settingsLink } from '@/lib/site/links';
import { loginUrl } from '@/lib/supabase';

import type { ExportAccount } from '../lib/export-format';
import { SETTINGS_SECTIONS } from '../lib/sections';
import { AppearanceSection } from './appearance-section';
import { ArenaSection } from './arena-section';
import { DataSection } from './data-section';
import { displayNameOf, ProfileSection } from './profile-section';
import { goToSection, SettingsNav } from './settings-nav';
import { ShortcutsSection } from './shortcuts-section';

function PageHeading({ email }: { email?: string | null | undefined }) {
  return (
    <header className="relative isolate overflow-hidden rounded-xl border border-line mesh-duel p-6 shadow-lift sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-60"
      />
      <p className="kicker text-mind-a">Account</p>
      <h1 className="mt-4 text-h1 text-fg">Settings</h1>
      <p className="mt-3 max-w-reading text-lead text-fg-soft">
        Your profile, how the Arena looks and behaves, and a copy of your data
        {email ? (
          <>
            {' '}
            for <span className="text-fg">{email}</span>
          </>
        ) : null}
        .
      </p>
    </header>
  );
}

function LoadingState() {
  return (
    <div
      aria-busy="true"
      className="grid gap-10 pt-8 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14"
    >
      <p className="sr-only" role="status">
        Loading your settings
      </p>
      <div className="hidden gap-2 lg:grid">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-full" />
        ))}
      </div>
      <div className="grid max-w-3xl gap-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-28 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}

/** Signed out after the redirect guard gave up (the loop guard), or sign-in is unavailable. */
function NoSessionState({ unavailable }: { unavailable: boolean }) {
  return (
    <div className="max-w-reading pt-10" data-testid="settings-signed-out">
      <div className="surface-duel grid justify-items-start gap-5 px-6 py-8 sm:px-8">
        <span
          aria-hidden="true"
          className="grid size-11 place-items-center rounded-lg border border-line bg-surface-2 text-fg-soft"
        >
          <LockKeyhole className="size-5" strokeWidth={1.75} />
        </span>
        <div className="grid gap-2">
          <h2 className="text-h3 text-fg">
            {unavailable ? 'Sign-in is unavailable here' : 'Sign in to see your settings'}
          </h2>
          <p className="text-ui text-fg-soft">
            {unavailable
              ? 'This copy of DualMind Arena was built without its sign-in settings, so there is no account to manage.'
              : 'Settings belong to your account: your profile, preferences and data export.'}
          </p>
        </div>
        {unavailable ? null : (
          <a
            href={loginUrl(settingsLink.href, window.location.origin)}
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}

function SignedIn({ user, profileName }: { user: User; profileName: string | null }) {
  const name = displayNameOf(user, profileName);
  const account = useMemo<ExportAccount>(
    () => ({ email: user.email ?? null, name: name || null }),
    [user.email, name],
  );

  // A link to a section (/settings/#data) arrives before the sections exist: go there once.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (SETTINGS_SECTIONS.some(section => section.id === id)) goToSection(id, false);
  }, []);
  return (
    <div className="grid gap-10 pt-10 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-14">
      <SettingsNav className="lg:sticky lg:top-24 lg:self-start" />
      <div className="grid max-w-3xl min-w-0 gap-14">
        <ProfileSection user={user} profileName={profileName} />
        <AppearanceSection />
        <ArenaSection />
        <ShortcutsSection />
        <DataSection account={account} />
      </div>
    </div>
  );
}

/**
 * `/settings/` (slice S12): profile, appearance (theme, motion), arena preferences, the keyboard
 * map and your data (export, account deletion), signed in only. Client-only (the Worker answers
 * with the SPA fallback, status 200, noindex); a signed-out visitor goes to
 * `/login/?redirect=/settings/`, and signing out here goes to the home page.
 */
export function SettingsPage() {
  const status = useRequireAuth();
  const { user, profile } = useAuth();

  let content;
  if (status === 'signed-in' && user) {
    content = <SignedIn user={user} profileName={profile?.name ?? null} />;
  } else if (status === 'loading') {
    content = <LoadingState />;
  } else {
    content = <NoSessionState unavailable={status === 'unavailable'} />;
  }

  return (
    <>
      <SkipLink />
      <SiteHeader
        variant="app"
        activePath={settingsLink.href}
        account={status === 'signed-in' ? <AccountMenu /> : undefined}
      />
      <main id="main" tabIndex={-1} className="outline-none" data-testid="settings-page">
        <PageContainer className="pt-10 pb-20 md:pt-14 md:pb-28">
          <PageHeading email={status === 'signed-in' ? user?.email : null} />
          {content}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
