/**
 * Prompt starters (new-features.md F-7): a blank box is the hardest UI, so the empty arena offers
 * curated prompts by category, each one picked to show a real difference between two models
 * (reasoning traps, code with edge cases, tone, maths that needs care). "Surprise me" picks one
 * at random. Choosing a starter fills the composer; nothing is sent until the visitor sends it.
 */

export interface StarterCategory {
  id: 'code' | 'reasoning' | 'writing' | 'math' | 'fun';
  label: string;
  prompts: readonly string[];
}

export const STARTER_CATEGORIES: readonly StarterCategory[] = [
  {
    id: 'code',
    label: 'Code',
    prompts: [
      'Write a Python function that removes duplicates from a list but keeps the original order. Explain its complexity.',
      'Review this SQL for bugs: SELECT name, COUNT(*) FROM orders GROUP BY customer_id;',
      'Explain the difference between debounce and throttle, with a short TypeScript example of each.',
      'Write a regular expression that matches a valid IPv4 address, and list three strings it must reject.',
    ],
  },
  {
    id: 'reasoning',
    label: 'Reasoning',
    prompts: [
      'Which is bigger, 9.11 or 9.9? Explain how you compared them.',
      'A bat and a ball cost 1.10 in total. The bat costs 1.00 more than the ball. How much is the ball?',
      'If it takes 5 machines 5 minutes to make 5 widgets, how long do 100 machines need for 100 widgets?',
      'Three friends split a bill of 75 and tip 20% on top. Two of them pay 30 each. What does the third pay?',
    ],
  },
  {
    id: 'writing',
    label: 'Writing',
    prompts: [
      'Write a polite email declining a meeting invitation, in under 80 words.',
      'Rewrite this sentence to be clearer: "The implementation of the solution was done by the team in a timely manner."',
      'Write the opening paragraph of a mystery story set in a lighthouse.',
      'Summarise the plot of Romeo and Juliet in exactly three sentences.',
    ],
  },
  {
    id: 'math',
    label: 'Math',
    prompts: [
      'Prove that the square root of 2 is irrational, step by step.',
      'What is the probability of rolling at least one six in four throws of a fair die?',
      'Explain the Monty Hall problem and why switching doors wins two times out of three.',
      'Solve for x: 3x + 7 = 2(x - 4) + 15. Show each step.',
    ],
  },
  {
    id: 'fun',
    label: 'Fun',
    prompts: [
      'Write a haiku about merge conflicts.',
      'Explain recursion to a ten-year-old using only words about cooking.',
      'Invent a board game that can be played with a deck of cards and three coins. Give the rules.',
      'Describe the color blue to someone who has never seen it.',
    ],
  },
];

export const ALL_STARTERS: readonly string[] = STARTER_CATEGORIES.flatMap(
  category => category.prompts,
);

/**
 * A random starter, never the same as `previous` (so "Surprise me" always changes something).
 * `random` returns a number in [0, 1), like Math.random.
 */
export function pickSurprise(random: () => number, previous: string | null = null): string {
  const pool = previous === null ? ALL_STARTERS : ALL_STARTERS.filter(p => p !== previous);
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  return pool[index] ?? ALL_STARTERS[0] ?? '';
}
