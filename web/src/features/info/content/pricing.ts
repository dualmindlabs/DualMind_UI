import type { PageContent } from './types';

/**
 * The pricing page. Everything on it is checkable: the limits are the ones in
 * server/rate-limit.js (RATE_LIMIT_GROUPS, mirrored in wrangler.jsonc), and the promise about
 * charging is the one the FAQ already makes. Keep all three in step.
 */
export const pricingContent: PageContent = {
  slug: 'pricing',
  title: 'Pricing',
  description:
    'DualMind Arena is free during the beta: no credit card, no paid tier yet. See what is included, the rate limits that apply today and how to reach us.',
  eyebrow: 'Pricing',
  heading: { text: 'Free during the beta,', human: 'no card needed.' },
  intro:
    'Creating an account and using the Arena costs nothing today. There is no paid plan and we do not ask for a credit card.',
  sections: [
    {
      id: 'free-beta',
      heading: 'Free during the beta',
      blocks: [
        {
          type: 'callout',
          tone: 'summary',
          title: 'The short version',
          text: 'Every feature of the Arena is free while it is in beta: blind battles, side by side comparisons, direct chat, history, sharing and the export of your data. If that ever changes, we will say so on this site before it does.',
        },
      ],
    },
    {
      id: 'included',
      heading: 'What is included',
      blocks: [
        {
          type: 'list',
          items: [
            'Battle: two anonymous models answer your prompt, you vote, then the names appear.',
            'Side by side: pick two models yourself and compare their answers.',
            'Direct: chat with one model of your choice.',
            'Conversation history, sharing by link and a download of all your data from Settings.',
            'The public leaderboard and the model directory, which need no account at all.',
          ],
        },
      ],
    },
    {
      id: 'limits',
      heading: 'The limits that apply today',
      blocks: [
        {
          type: 'paragraph',
          text: 'Limits keep the Arena fast for everyone. They are counted per signed-in account (per network address when you are not signed in) and are approximate, so you may see them kick in a little earlier or later than the numbers below.',
        },
        {
          type: 'definitions',
          items: [
            {
              term: 'Battles and chat',
              description:
                '6 per minute. A battle sends your prompt to two models, so this is the limit most people notice.',
            },
            {
              term: 'Votes',
              description: '10 per 10 seconds.',
            },
            {
              term: 'Reading the leaderboard, models and your history',
              description: '30 requests per 10 seconds.',
            },
            {
              term: 'Other changes (renaming, sharing, deleting)',
              description: '30 per minute.',
            },
            {
              term: 'Read aloud',
              description: '10 speech requests per minute.',
            },
          ],
        },
        {
          type: 'paragraph',
          text: 'When you go over a limit, the Arena tells you how long to wait and your vote is kept and sent for you. Limits can change during the beta. This page always shows the current ones.',
        },
      ],
    },
    {
      id: 'after-beta',
      heading: 'After the beta',
      blocks: [
        {
          type: 'paragraph',
          text: 'We have not set prices and we have not decided what a paid plan would include. What we can promise is the order of events: any change to what is free is announced here first, and your account and conversations stay yours either way.',
        },
      ],
    },
    {
      id: 'api-and-contact',
      heading: 'API access and higher limits',
      blocks: [
        {
          type: 'paragraph',
          text: 'The public API reference is on the [API](/developers/) page. If you need API access for a project, or higher limits than the ones above, write to support@dualmindlab.tech and tell us what you are building.',
        },
      ],
    },
  ],
};
