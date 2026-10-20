import type { VoteChoice } from '../types';

/** A static battle for the roles demo. Written for the style guide, not model output. */
export const demoBattle = {
  prompt: 'Explain recursion to a ten-year-old in three sentences.',
  a: {
    meta: '1.2 s · 63 words',
    paragraphs: [
      'Recursion is when you solve a problem by solving a smaller copy of the same problem.',
      'Think of nesting dolls: to reach the smallest one, you open a doll and do exactly the same thing with the doll inside.',
      'You stop when a doll does not open, and that stopping point is what keeps it from going on forever.',
    ],
  },
  b: {
    meta: '1.6 s · 58 words',
    paragraphs: [
      'Imagine standing in a long line and wanting to know your place in it.',
      'You ask the person ahead of you, they ask the person ahead of them, and so on, until the first person says "I am number one."',
      'Each answer then travels back down the line, one more each time, until it reaches you.',
    ],
  },
} as const;

export const voteChoices: ReadonlyArray<{ id: VoteChoice; label: string; shortcut: string }> = [
  { id: 'a', label: 'A is better', shortcut: '1' },
  { id: 'tie', label: 'Tie', shortcut: '3' },
  { id: 'bad', label: 'Both are bad', shortcut: '4' },
  { id: 'b', label: 'B is better', shortcut: '2' },
];
