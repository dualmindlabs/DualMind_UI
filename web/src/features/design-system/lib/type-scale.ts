/** The type scale of the Instrument direction, as shown on the style guide. */
export const typeScale: ReadonlyArray<{
  name: string;
  spec: string;
  use: string;
  sample: string;
  className: string;
}> = [
  {
    name: 'Display',
    spec: 'Geist 600, clamp(3.5rem, 1.6rem + 8.6vw, 8.5rem) / 0.92, -0.055em',
    use: 'Hero headlines and the verdict. One per page.',
    sample: 'Two models.',
    className: 'text-display',
  },
  {
    name: 'H1',
    spec: 'Geist 600, clamp(2.5rem, 1.7rem + 3.6vw, 5rem) / 1, -0.045em',
    use: 'Page titles',
    sample: 'A leaderboard you can trust',
    className: 'text-h1',
  },
  {
    name: 'H2',
    spec: 'Geist 600, clamp(2rem, 1.5rem + 1.9vw, 3.25rem) / 1.05, -0.04em',
    use: 'Sections',
    sample: 'How a battle works',
    className: 'text-h2',
  },
  {
    name: 'H3',
    spec: 'Geist 600, clamp(1.25rem, 1.12rem + 0.5vw, 1.5rem) / 1.25, -0.022em',
    use: 'Cards and panes',
    sample: 'Answer A, in 1.2 seconds',
    className: 'text-h3 font-semibold',
  },
  {
    name: 'Lead',
    spec: 'Geist 400, clamp(1.125rem, 1.04rem + 0.4vw, 1.375rem) / 1.5',
    use: 'The paragraph under a heading',
    sample: 'Two answers, one prompt, and no names until you have voted.',
    className: 'text-lead max-w-[56ch] text-fg-soft',
  },
  {
    name: 'Body',
    spec: 'Geist 400, 1rem / 1.65, max 72ch',
    use: 'Answers and prose, 16px on phones too',
    sample:
      'Two models answer the same prompt side by side. You read both, pick the better one, and only then see which model wrote which answer. Every vote moves the public leaderboard.',
    className: 'text-body max-w-[72ch]',
  },
  {
    name: 'UI',
    spec: 'Geist 500, 0.9375rem / 1.45',
    use: 'Controls, sidebar, tables',
    sample: 'Start a new battle',
    className: 'text-ui font-medium',
  },
  {
    name: 'Stat',
    spec: 'Geist Mono 500, clamp(2.5rem, 1.9rem + 2.4vw, 4.25rem) / 1, -0.04em, tabular',
    use: 'Elo, rank, vote counts',
    sample: '1,284',
    className: 'numeric text-stat',
  },
  {
    name: 'Label',
    spec: 'Geist Mono 500, 0.75rem / 1.2, 0.12em caps',
    use: 'Data labels, badges, key hints',
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
    voice: 'Display',
    family: 'Geist Variable 600, -0.055em',
    use: 'Headlines: large, dense, tightly tracked',
    sample: 'Aa',
    className: 'font-sans font-semibold tracking-[-0.055em]',
  },
  {
    voice: 'Machine voice',
    family: 'Geist Variable, 100 to 900',
    use: 'UI and body, model answers included',
    sample: 'Aa',
    className: 'font-sans font-medium',
  },
  {
    voice: 'Human voice',
    family: 'Geist 600 in the human colour, underlined',
    use: 'One phrase per heading, at most',
    sample: 'You decide.',
    className: 'human-voice font-semibold text-human',
  },
  {
    voice: 'Data voice',
    family: 'Geist Mono Variable, tabular',
    use: 'Elo, counts, labels, shortcuts and code',
    sample: '1,284',
    className: 'numeric',
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
