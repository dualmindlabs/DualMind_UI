import type { PageContent } from './types';

export const cookiesContent: PageContent = {
  slug: 'cookies',
  title: 'Cookie Policy',
  description:
    'DualMind Arena sets no tracking cookies. This page lists the browser storage it does use: your sign-in session, your theme and one pre-launch preview cookie.',
  eyebrow: 'Legal',
  heading: { text: 'Cookies,', human: 'almost none.' },
  intro:
    'DualMind Arena does not track you with cookies. This page lists everything it stores in your browser, so you can check it.',
  updated: '2026-10-20',
  sections: [
    {
      id: 'summary',
      heading: 'Summary',
      blocks: [
        {
          type: 'callout',
          tone: 'summary',
          title: 'The short version',
          text: 'We do not use analytics, advertising or tracking cookies. The Arena keeps your sign-in session and a few settings in your browser’s local storage. The only cookie we set is dm_preview, and only if you open a preview link before launch.',
        },
      ],
    },
    {
      id: 'cookies-we-set',
      heading: 'The one cookie',
      blocks: [
        {
          type: 'definitions',
          items: [
            {
              term: 'dm_preview',
              description:
                'Set only when you open a link with the preview code, which lets you see the Arena before it opens to everyone. It lasts 30 days and only tells our server to show you the Arena instead of the waitlist. It is removed when you open the link that turns the preview off, or when you clear your cookies.',
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'Cloudflare, which delivers this site, may set a security cookie to protect it from abuse. We do not read it or use it for any other purpose.',
        },
      ],
    },
    {
      id: 'local-storage',
      heading: 'Browser storage we use instead',
      blocks: [
        {
          type: 'paragraph',
          text: 'Local storage and session storage stay in your browser. They are not sent to us on every request, and we use them only to make the app work.',
        },
        {
          type: 'definitions',
          items: [
            {
              term: 'Sign-in session (local storage)',
              description:
                'The session from our sign-in provider, Supabase. It keeps you signed in and is sent to the API as proof of who you are. It is removed when you sign out.',
            },
            {
              term: 'theme (local storage)',
              description: 'Whether you chose the dark theme, the light theme or the system setting.',
            },
            {
              term: 'Model choices (local storage)',
              description:
                'The models you last picked for Battle, Side by side and Direct, so they are preselected next time.',
            },
            {
              term: 'Unsent votes (local storage)',
              description:
                'If you vote while the connection to the API is down, the vote is kept here and sent when the connection returns.',
            },
            {
              term: 'Sign-in redirect flag (session storage)',
              description:
                'A short-lived marker that stops a redirect loop between the app and the sign-in page. It is cleared when you close the tab.',
            },
            {
              term: 'Waitlist flag (local storage)',
              description:
                'A marker on the waitlist site that remembers you already joined, so the form does not ask again.',
            },
          ],
        },
      ],
    },
    {
      id: 'no-tracking',
      heading: 'What we do not use',
      blocks: [
        {
          type: 'list',
          items: [
            'No analytics cookies or scripts.',
            'No advertising cookies, and no ads.',
            'No tracking pixels.',
            'No A/B testing tools.',
            'No cookies from social networks.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Because we only use storage that the app needs to work, we do not show a cookie banner. If we ever add anything optional, we will ask first.',
        },
      ],
    },
    {
      id: 'manage',
      heading: 'Managing and clearing storage',
      blocks: [
        {
          type: 'paragraph',
          text: 'You can see, block or delete cookies and site data in your browser settings. In most browsers you can also open the developer tools, choose the Application or Storage tab, and delete the entries for this site.',
        },
        {
          type: 'paragraph',
          text: 'If you clear it all, you will be signed out and your theme and model choices will reset. The Arena still works if you block the preview cookie, since normal visitors never receive it.',
        },
        {
          type: 'paragraph',
          text: 'Do Not Track: we do not track you, so there is nothing for the setting to switch off.',
        },
      ],
    },
    {
      id: 'third-parties',
      heading: 'Third parties',
      blocks: [
        {
          type: 'paragraph',
          text: 'Some pages load fonts or code libraries from a content delivery network. These requests share your IP address and browser details with that network, the same as any web request. The Privacy Policy covers the providers that handle your data.',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes',
      blocks: [
        {
          type: 'paragraph',
          text: 'If we change what the site stores, we will update this page and its date.',
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      blocks: [
        {
          type: 'list',
          items: [
            'Privacy questions: privacy@dualmindlab.tech',
            'General help: support@dualmindlab.tech',
          ],
        },
      ],
    },
  ],
};
