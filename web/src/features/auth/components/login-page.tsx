import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { Link, useLocation } from 'react-router';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { config } from '@/config/env';
import { supabaseConfig } from '@/config/supabase';
import { browserLocalStorage, sendLoginNotice, SIGNUP_PATH, withRedirect } from '@/lib/supabase';

import { QUOTES } from '../content/copy';
import { goTo, useRedirectTarget } from '../hooks/use-redirect-target';
import { AuthGate } from './auth-gate';
import { AuthHeading } from './auth-heading';
import { AuthShell } from './auth-shell';
import { CodeSignIn } from './code-sign-in';
import { FormStatus } from './form-status';
import { OAuthButtons, OrDivider } from './oauth-buttons';
import { PasswordSignIn } from './password-sign-in';
import { PromptDraftNotice } from './prompt-draft-notice';

const TAB = 'h-11 flex-1 px-2 pointer-coarse:h-11';

/**
 * `/login/`: Google and GitHub, then email and password, an email code or a text-message code.
 * After signing in, the browser goes to the validated `?redirect=` or `/` (which hands signed-in
 * visitors to the arena), with a full page load.
 */
export function LoginPage() {
  const target = useRedirectTarget();
  const { search } = useLocation();
  const [providerError, setProviderError] = useState<string | null>(null);

  const onSignedIn = (session: Session) => {
    if (supabaseConfig) {
      void sendLoginNotice({ supabaseUrl: supabaseConfig.url, session }, browserLocalStorage());
    }
    goTo(target);
  };

  return (
    <AuthShell quote={QUOTES.login}>
      <div className="grid gap-8">
        <AuthHeading
          eyebrow="Sign in"
          title="Welcome back to the"
          voice="Arena."
          lead="Your battles, votes and threads are where you left them."
        />
        <PromptDraftNotice title="Sign in to run your prompt" />
        <AuthGate target={target}>
          <div className="grid gap-6">
            <div className="grid gap-3">
              <OAuthButtons onError={setProviderError} />
              <FormStatus error={providerError} status={null} />
            </div>
            <OrDivider label="or with your email or phone" />
            <Tabs defaultValue="password" className="gap-6">
              <TabsList aria-label="How to sign in" className="w-full">
                <TabsTrigger value="password" className={TAB}>
                  Password
                </TabsTrigger>
                <TabsTrigger value="email-code" className={TAB}>
                  Email code
                </TabsTrigger>
                <TabsTrigger value="phone-code" className={TAB}>
                  Phone code
                </TabsTrigger>
              </TabsList>
              <TabsContent value="password">
                <PasswordSignIn onSignedIn={onSignedIn} />
              </TabsContent>
              <TabsContent value="email-code">
                <CodeSignIn channel="email" onSignedIn={onSignedIn} />
              </TabsContent>
              <TabsContent value="phone-code">
                <CodeSignIn channel="phone" onSignedIn={onSignedIn} />
              </TabsContent>
            </Tabs>
          </div>
        </AuthGate>
        <p className="text-ui-sm text-fg-soft">
          New to DualMind?{' '}
          <Link
            to={withRedirect(SIGNUP_PATH, search, config.siteUrl)}
            className="font-medium text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
