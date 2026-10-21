import { useEffect, useRef } from 'react';

import { buttonVariants } from '@/components/ui/button';
import { config } from '@/config/env';
import { supabaseConfig } from '@/config/supabase';
import { useAuth } from '@/hooks/use-auth';
import { browserSessionStorage, LOGIN_PATH, safeRedirect, sendWelcomeOnce } from '@/lib/supabase';
import { cn } from '@/lib/utils/cn';

import { CALLBACK_REDIRECT_SECONDS } from '../content/copy';
import { useAutoRedirect } from '../hooks/use-auto-redirect';
import {
  callbackErrorMessage,
  type CallbackType,
  type CallbackUrl,
  wantsWelcome,
} from '../lib/callback-url';
import { NewLinkForm } from './new-link-form';
import { StatusCard } from './status-card';
import { StatusShell } from './status-shell';

const SUCCESS_TITLES: Partial<Record<CallbackType, string>> = {
  signup: 'Your email is confirmed',
  email_confirmation: 'Your email is confirmed',
  invite: 'Welcome to DualMind Arena',
  email_change: 'Your new email address is confirmed',
};

function BackToSignIn() {
  return (
    <a href={LOGIN_PATH} className={buttonVariants({ variant: 'primary' })}>
      Back to sign in
    </a>
  );
}

/** A link that failed: a fresh one by email (reset or confirmation, by flow), or back to sign in. */
function NewLinkActions({ link }: { link: CallbackUrl }) {
  return (
    <>
      <NewLinkForm kind={link.type === 'recovery' ? 'reset' : 'confirmation'} />
      <a href={LOGIN_PATH} className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
        Back to sign in
      </a>
    </>
  );
}

/**
 * `/auth-callback.html`, where confirmation and sign-in emails land (unchanged address).
 * supabase-js reads the tokens from the #hash; this page shows the result, sends the welcome
 * email after a sign-up confirmation (the `email-wel-safe` function, once per user and tab),
 * and moves on to `?redirect` or `/` after a few seconds. Recovery links never render here: the
 * route forwards them to /update-password.html with the hash.
 */
export function AuthCallbackPage({ link }: { link: CallbackUrl }) {
  const { status, session } = useAuth();
  const welcomed = useRef(false);
  const signedIn = !link.error && status === 'signed-in' && session !== null;
  const target = safeRedirect(link.redirect, config.siteUrl);
  const progress = useAutoRedirect(signedIn ? target : null, CALLBACK_REDIRECT_SECONDS);

  useEffect(() => {
    if (!signedIn || !session || !supabaseConfig || welcomed.current || !wantsWelcome(link)) {
      return;
    }
    welcomed.current = true;
    void sendWelcomeOnce(
      {
        supabaseUrl: supabaseConfig.url,
        session,
        extra: { redirectUrl: `${window.location.origin}/` },
      },
      browserSessionStorage(),
    );
  }, [signedIn, session, link]);

  let content;
  if (link.error) {
    content = (
      <StatusCard tone="error" title="This link did not work" action={<NewLinkActions link={link} />}>
        {callbackErrorMessage(link.error)}
      </StatusCard>
    );
  } else if (status === 'unavailable') {
    content = (
      <StatusCard tone="error" title="Sign-in is unavailable here" action={<BackToSignIn />}>
        This copy of DualMind Arena was built without its sign-in settings.
      </StatusCard>
    );
  } else if (status === 'loading') {
    content = (
      <StatusCard tone="working" title="Confirming your link">
        This takes a moment.
      </StatusCard>
    );
  } else if (signedIn) {
    const seconds = Math.max(1, Math.ceil(CALLBACK_REDIRECT_SECONDS * (1 - progress)));
    content = (
      <StatusCard
        tone="success"
        title={(link.type && SUCCESS_TITLES[link.type]) ?? 'You are signed in'}
        progress={progress}
        action={
          <a href={target} className={buttonVariants({ variant: 'primary' })}>
            Continue now
          </a>
        }
      >
        Taking you to the Arena in {seconds} s.
      </StatusCard>
    );
  } else {
    content = (
      <StatusCard
        tone="error"
        title="We could not confirm this link"
        action={<NewLinkActions link={link} />}
      >
        {callbackErrorMessage(null)}
      </StatusCard>
    );
  }

  return <StatusShell>{content}</StatusShell>;
}
