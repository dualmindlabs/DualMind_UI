import { DEMO_BATTLES } from './demo';

/**
 * Copy for the landing page (`/`, signed out). Every claim here is checkable: the product
 * behaviour matches the How it works page (features/info/content/how-it-works.ts), and numbers
 * only ever come from the live leaderboard.
 */

/** The sign-in page (slice S6); the old /login-modern.html answers with a 301 to it. */
export const SIGN_IN_HREF = '/login/';
export const LEADERBOARD_HREF = '/leaderboard/';
export const HOW_IT_WORKS_HREF = '/how-it-works/';

export const SEO = {
  title: 'DualMind Arena: blind battles between AI models',
  description:
    'Ask one prompt, compare two anonymous AI answers side by side and vote for the better one. Names appear after your vote, and every vote feeds a public Elo leaderboard.',
  ogImage: '/og/landing.png',
  ogImageAlt:
    'DualMind Arena. Two models. One prompt. You decide. Two answer panes, A in cyan and B in violet.',
} as const;

export const HERO = {
  eyebrow: 'Live arena',
  eyebrowDetail: 'Blind battles, public Elo ratings',
  eyebrowShort: 'See the leaderboard',
  headline: 'Two models. One prompt.',
  human: 'You decide.',
  subhead:
    'Ask once and read two anonymous answers side by side. Vote for the better one, then see which models wrote them.',
  composerLabel: 'Ask both models',
  composerSubmit: 'Send to both models',
} as const;

/**
 * The line under the hero composer. Signed out, a typed prompt goes to sign-in and waits in the
 * arena (UI audit P1-1); only the chips play the recorded demo, and the copy says so.
 */
export const HERO_STATUS = {
  idle: 'Your own prompt runs on real models after a free sign-in.',
  signIn: 'Taking you to sign in. Your prompt goes with you.',
  demo: 'Playing a recorded battle below.',
  demoLink: 'Sign in to battle real models',
} as const;

/**
 * The rotating examples in the hero composer (placeholders only, never sent): the three recorded
 * demo prompts first (their chips play the recorded battles), then prompts people bring to the
 * Arena.
 */
export const EXAMPLE_PROMPTS: readonly string[] = [
  ...DEMO_BATTLES.map(battle => battle.prompt),
  'Write a haiku about merge conflicts',
  'Plan a three-day trip to Lisbon on a small budget',
  'Which is bigger, 9.11 or 9.9?',
  'Refactor this function to avoid the nested loops',
];

export interface Feature {
  id: 'blind' | 'pairings' | 'ratings' | 'method';
  title: string;
  body: string;
  link?: { label: string; href: string };
}

export const FEATURES: readonly Feature[] = [
  {
    id: 'blind',
    title: 'Blind by design',
    body: 'Model names stay hidden until your vote is recorded. You judge the answer, not the brand.',
  },
  {
    id: 'pairings',
    title: 'Fair pairings',
    body: 'Which model sits on side A or side B is random in every battle, so position never decides.',
  },
  {
    id: 'ratings',
    title: 'Live ratings',
    body: 'Every vote moves an Elo rating. The leaderboard shows the ratings next to the battles behind them.',
  },
  {
    id: 'method',
    title: 'Open methodology',
    body: 'The rating formula, the four vote choices and what counts as a fair vote are written down for anyone to check.',
    link: { label: 'Read how ratings work', href: `${HOW_IT_WORKS_HREF}#rating` },
  },
];

export interface Step {
  title: string;
  body: string;
}

export const STEPS: readonly Step[] = [
  {
    title: 'Ask',
    body: 'Write any prompt: a question, a task, a piece of code, a short story. The same prompt goes to two models at the same time.',
  },
  {
    title: 'Compare',
    body: 'The answers appear side by side as A and B. Neither shows a model name, and which model is on which side is random.',
  },
  {
    title: 'Vote',
    body: 'Choose A is better, B is better, Tie, or Both are bad. A tie counts as half a win for each model.',
  },
  {
    title: 'Reveal',
    body: 'The names appear after your vote is recorded, and both ratings move toward the result. Then keep talking, or start a new battle.',
  },
];
