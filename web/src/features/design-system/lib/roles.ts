import type { Role } from '../types';

/** Token utilities per role. Colour is never the only signal: A and B also carry a letter. */
export const roleStyles: Record<
  Role,
  { letter: string; name: string; text: string; fill: string; tint: string; border: string }
> = {
  a: {
    letter: 'A',
    name: 'Mind A',
    text: 'text-mind-a',
    fill: 'bg-mind-a',
    tint: 'bg-mind-a-tint',
    border: 'border-mind-a/45',
  },
  b: {
    letter: 'B',
    name: 'Mind B',
    text: 'text-mind-b-text',
    fill: 'bg-mind-b',
    tint: 'bg-mind-b-tint',
    border: 'border-mind-b/55',
  },
  human: {
    letter: 'You',
    name: 'Human',
    text: 'text-human',
    fill: 'bg-human',
    tint: 'bg-human-tint',
    border: 'border-human/50',
  },
};

export const roleDetails: ReadonlyArray<{
  role: Role;
  token: `--${string}`;
  meaning: string;
  rule: string;
}> = [
  {
    role: 'a',
    token: '--mind-a',
    meaning: 'The first model. Cyan, the cool machine voice.',
    rule: 'Always left or on top, always with an A badge.',
  },
  {
    role: 'b',
    token: '--mind-b',
    meaning: 'The second model. Terracotta, equal in status to A.',
    rule: 'Always right or below, always with a B badge. Text uses --mind-b-text.',
  },
  {
    role: 'human',
    token: '--human',
    meaning: 'You: your prompt, your vote, the winner you picked.',
    rule: 'Champagne gold, never used for a model. It never marks a model as good or bad.',
  },
];
