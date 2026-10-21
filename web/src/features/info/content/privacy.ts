import type { PageContent } from './types';

export const privacyContent: PageContent = {
  slug: 'privacy',
  title: 'Privacy Policy',
  description:
    'What DualMind Arena collects, why, who handles it, how long we keep it and how to delete it. No analytics, no advertising and no data sales.',
  eyebrow: 'Legal',
  heading: { text: 'Privacy,', human: 'in plain words.' },
  intro:
    'This policy explains what DualMind Arena ("we", "us") collects when you use the Arena at arena.dualmindlab.tech and the waitlist at early.dualmindlab.tech, and what we do with it.',
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
          text: 'We store your account details, your prompts and the answers, and your votes, so the Arena works. Your prompts go to the AI model providers that answer them. We do not use analytics, advertising or tracking pixels, and we do not sell your data. You can ask us to delete your account and data at privacy@dualmindlab.tech.',
        },
      ],
    },
    {
      id: 'what-we-collect',
      heading: 'What we collect',
      blocks: [
        {
          type: 'definitions',
          items: [
            {
              term: 'Account data',
              description:
                'When you sign up: your email address, and optionally your name and phone number. Passwords are handled by our sign-in provider and we never see them. If you sign in with GitHub or Google, we receive the basic profile details that provider shares.',
            },
            {
              term: 'Prompts and answers',
              description:
                'The prompts you send and the answers the models return are stored by the DualMind API in conversation threads linked to your account.',
            },
            {
              term: 'Votes',
              description:
                'Your vote on each battle (A better, B better, tie or both bad), the models involved and how long you took to vote.',
            },
            {
              term: 'Shared threads',
              description:
                'If you make a conversation viewable by link, the people who have the link can read it. Conversations are private until you share them.',
            },
            {
              term: 'Waitlist data',
              description:
                'If you join the waitlist: your email address, the referral label from the link you came through (if any), your country as reported by Cloudflare, and the first 256 characters of your browser’s user agent. We do not store your IP address in the waitlist.',
            },
            {
              term: 'Technical data',
              description:
                'Our hosting and sign-in providers process technical details such as your IP address and browser type to deliver pages and keep the service secure. We do not use that data for analytics.',
            },
          ],
        },
      ],
    },
    {
      id: 'what-we-do-not-collect',
      heading: 'What we do not do',
      blocks: [
        {
          type: 'list',
          items: [
            'We do not load analytics scripts and we do not measure page views or sessions.',
            'We do not show advertising and we do not share data with advertisers.',
            'We do not use tracking pixels or cross-site tracking.',
            'We do not sell your personal data.',
            'We do not run A/B tests on you.',
          ],
        },
      ],
    },
    {
      id: 'how-we-use-it',
      heading: 'How we use it',
      blocks: [
        {
          type: 'list',
          items: [
            'To sign you in and keep your account secure.',
            'To run battles, send your prompts to models and show you the answers.',
            'To save your history so you can come back to it.',
            'To calculate the Elo ratings and the public leaderboard from votes. The leaderboard shows models and totals, never who voted.',
            'To prevent abuse, such as automated voting.',
            'To answer your messages to support or privacy.',
            'To tell waitlist members when the Arena opens.',
          ],
        },
      ],
    },
    {
      id: 'who-handles-it',
      heading: 'Who handles your data',
      blocks: [
        {
          type: 'paragraph',
          text: 'We use a small number of service providers (processors). Each one handles data only to provide its service to us.',
        },
        {
          type: 'definitions',
          items: [
            {
              term: 'Supabase',
              description: 'Sign-in (authentication) and the database that holds account data.',
            },
            {
              term: 'Cloudflare',
              description: 'Hosting and delivery of this site, and the database for the waitlist.',
            },
            {
              term: 'Microsoft Azure',
              description: 'Hosting for the DualMind API, which stores threads, answers and votes.',
            },
            {
              term: 'AI model providers',
              description:
                'The company that runs the model answering a prompt receives that prompt, and in a conversation the earlier messages, so it can reply. Which providers receive your prompt depends on the models you or the Arena choose. The Models page shows the models in use. Each provider handles the prompt under its own terms.',
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'Some pages load fonts or code libraries from a content delivery network. That network can see your IP address and browser details when it serves the file.',
        },
        {
          type: 'paragraph',
          text: 'We may disclose data if the law requires it, for example in response to a valid court order.',
        },
        {
          type: 'callout',
          tone: 'warning',
          title: 'Do not put secrets in prompts',
          text: 'Prompts are processed by third-party model providers and stored in your history. Do not enter passwords, personal identity numbers or confidential material.',
        },
      ],
    },
    {
      id: 'storage-not-cookies',
      heading: 'Cookies and browser storage',
      blocks: [
        {
          type: 'paragraph',
          text: 'We do not use cookies for tracking. The Arena keeps your sign-in session and a few settings in your browser’s local storage, and sets one cookie only on preview links before launch. The Cookie Policy lists each item.',
        },
      ],
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      blocks: [
        {
          type: 'list',
          items: [
            'Account data: until you ask us to delete your account.',
            'Conversations: until you delete them or delete your account.',
            'Votes: kept so the leaderboard stays accurate. The leaderboard shows only totals per model. If you ask us to delete your account, tell us what you want done with your votes.',
            'Waitlist entries: until you ask us to remove them.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Backups held by our providers may keep a copy for a short time after deletion.',
        },
      ],
    },
    {
      id: 'your-rights',
      heading: 'Your choices and rights',
      blocks: [
        {
          type: 'paragraph',
          text: 'You can ask us for a copy of your data, to correct it, or to delete it. You can delete conversations yourself from the sidebar, and download all of them from Settings as Markdown, JSON, CSV, HTML or PDF. For everything else, including deleting your account, write to privacy@dualmindlab.tech from the email address on the account. We will answer as soon as we can.',
        },
        {
          type: 'paragraph',
          text: 'Depending on where you live, you may have further rights, such as complaining to your local data protection authority. Nothing in this policy limits them.',
        },
      ],
    },
    {
      id: 'security',
      heading: 'Security',
      blocks: [
        {
          type: 'paragraph',
          text: 'Data travels over HTTPS. Sign-in is handled by Supabase, and the API checks your session before it returns your data. No service is perfectly secure, so we cannot promise absolute security.',
        },
      ],
    },
    {
      id: 'transfers',
      heading: 'International transfers',
      blocks: [
        {
          type: 'paragraph',
          text: 'Our providers run services in several countries, so your data may be processed outside the country you live in. We choose providers that protect data to a recognised standard.',
        },
      ],
    },
    {
      id: 'children',
      heading: 'Children',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Arena is not for children under 13, and we do not knowingly collect their data. If you think a child has given us personal data, write to privacy@dualmindlab.tech and we will delete it.',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      blocks: [
        {
          type: 'paragraph',
          text: 'If we change what we collect or how we use it, we will update this page and its date, and we will tell signed-in users in the app before a material change takes effect.',
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
            'Privacy and data requests: privacy@dualmindlab.tech',
            'General help: support@dualmindlab.tech',
          ],
        },
      ],
    },
  ],
};
