/**
 * Copy for the sign-in pages: SEO, headings and the brand panel's quotes. One short quote per
 * page, written in the product's voice (not attributed to a real person).
 */

export interface BrandQuote {
  text: string;
  /** Where the line comes from: the battle it describes, not a person. */
  source: string;
}

export const QUOTES = {
  login: {
    text: 'Both answers were right. Only one of them was useful.',
    source: 'Example, from a battle on a code-review prompt',
  },
  signup: {
    text: 'You never see the names until you vote. That is the whole point.',
    source: 'How every battle in the Arena works',
  },
  recovery: {
    text: 'Two models. One prompt. You decide.',
    source: 'DualMind Arena',
  },
} as const satisfies Record<string, BrandQuote>;

export const SEO = {
  login: {
    title: 'Sign in · DualMind Arena',
    description:
      'Sign in to DualMind Arena to run blind battles between AI models, vote for the better answer and keep your threads.',
  },
  signup: {
    title: 'Create your account · DualMind Arena',
    description:
      'Create a free DualMind Arena account: ask once, compare two anonymous AI models side by side, and vote to move the leaderboard.',
  },
  forgotPassword: {
    title: 'Reset your password · DualMind Arena',
    description: 'Get a link to choose a new password for your DualMind Arena account.',
  },
  updatePassword: {
    title: 'Choose a new password · DualMind Arena',
    description: 'Set a new password for your DualMind Arena account.',
  },
  callback: {
    title: 'Confirming your sign-in · DualMind Arena',
    description: 'Finishing your DualMind Arena sign-in.',
  },
} as const;

/** Seconds before "Resend" works again (Supabase limits emails and texts per address). */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Seconds the callback page waits before it moves on by itself. */
export const CALLBACK_REDIRECT_SECONDS = 4;
