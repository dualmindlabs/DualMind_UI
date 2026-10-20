/** The type scale from design-direction.md section 4, as shown on the style guide. */
export const typeScale: ReadonlyArray<{
  name: string;
  spec: string;
  use: string;
  sample: string;
  className: string;
}> = [
  {
    name: 'Display',
    spec: 'clamp(3rem, 8vw, 6.5rem) / 0.95, 300, -0.045em',
    use: 'Landing hero only',
    sample: 'Two minds.',
    className: 'text-display',
  },
  {
    name: 'H1',
    spec: 'clamp(2.25rem, 4vw, 3.5rem) / 1.05, 500',
    use: 'Page titles',
    sample: 'A leaderboard you can trust',
    className: 'text-h1 font-medium',
  },
  {
    name: 'H2',
    spec: '1.75-2.25rem / 1.15, 500',
    use: 'Sections',
    sample: 'How a battle works',
    className: 'text-h2 font-medium',
  },
  {
    name: 'H3',
    spec: '1.25rem / 1.3, 600',
    use: 'Cards and panes',
    sample: 'Answer A, in 1.2 seconds',
    className: 'text-h3 font-semibold',
  },
  {
    name: 'Body',
    spec: '1rem / 1.65, 400, max 72ch',
    use: 'Answers and prose, 16px on phones too',
    sample:
      'Two models answer the same prompt side by side. You read both, pick the better one, and only then see which model wrote which answer. Every vote moves the public leaderboard.',
    className: 'text-body max-w-[72ch]',
  },
  {
    name: 'UI',
    spec: '0.9375rem / 1.45, 500',
    use: 'Controls, sidebar, tables',
    sample: 'Start a new battle',
    className: 'text-ui font-medium',
  },
  {
    name: 'Label',
    spec: 'DM Mono 0.6875rem / 1.2, 500, 0.26em caps',
    use: 'Eyebrows, badges, key hints',
    sample: 'Model A / 1.2 s / 63 words',
    className: 'eyebrow text-fg-soft',
  },
];

export const typeVoices: ReadonlyArray<{
  voice: string;
  family: string;
  use: string;
  sample: string;
  className: string;
}> = [
  {
    voice: 'Machine voice',
    family: 'Bricolage Grotesque Variable',
    use: 'UI and body, model answers included',
    sample: 'Aa',
    className: 'font-sans font-semibold',
  },
  {
    voice: 'Human voice',
    family: 'Playfair Display Italic',
    use: 'One phrase per heading, at most',
    sample: 'You decide.',
    className: 'human-voice text-human',
  },
  {
    voice: 'Labels',
    family: 'DM Mono 400 / 500',
    use: 'Eyebrows, badges, keyboard hints',
    sample: 'A / B',
    className: 'font-mono font-medium',
  },
  {
    voice: 'Code',
    family: 'JetBrains Mono Variable',
    use: 'Code blocks and inline code in answers',
    sample: 'vote(a, b)',
    className: 'font-code',
  },
];

export const leaderboardSample: ReadonlyArray<{
  rank: number;
  model: string;
  elo: string;
  battles: string;
  winRate: string;
}> = [
  { rank: 1, model: 'Model A', elo: '1,284', battles: '12,408', winRate: '61.2%' },
  { rank: 2, model: 'Model B', elo: '1,247', battles: '9,915', winRate: '57.8%' },
  { rank: 3, model: 'Model C', elo: '1,201', battles: '11,032', winRate: '51.0%' },
];
