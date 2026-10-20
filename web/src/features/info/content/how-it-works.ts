import type { PageContent } from './types';

export const howItWorksContent: PageContent = {
  slug: 'how-it-works',
  title: 'How DualMind Arena works',
  description:
    'Ask once, compare two anonymous answers and vote. See how votes turn into an Elo rating, what stays hidden until you vote, and what counts as a fair vote.',
  eyebrow: 'How it works',
  heading: { text: 'Ask. Compare.', human: 'You decide.' },
  intro:
    'A battle takes four steps. This page also explains how votes become ratings, so you can judge the leaderboard for yourself.',
  sections: [
    {
      id: 'steps',
      heading: 'A battle in four steps',
      blocks: [
        {
          type: 'steps',
          items: [
            {
              title: 'Ask',
              body: 'Write any prompt: a question, a task, a piece of code, a short story. The same prompt goes to two models at the same time.',
            },
            {
              title: 'Compare two anonymous answers',
              body: 'The answers appear side by side, labelled A and B. Neither shows a model name. Which model is on which side is random.',
            },
            {
              title: 'Vote',
              body: 'Choose A is better, B is better, Tie, or Both are bad. Take the time you need.',
            },
            {
              title: 'Reveal',
              body: 'After you vote, the model names appear. You can keep talking in the same thread, start a new battle, or compare two models you pick yourself.',
            },
          ],
        },
      ],
    },
    {
      id: 'vote-choices',
      heading: 'The four vote choices',
      blocks: [
        {
          type: 'definitions',
          items: [
            {
              term: 'A is better',
              description: 'The answer on the left is clearly the better one.',
            },
            {
              term: 'B is better',
              description: 'The answer on the right is clearly the better one.',
            },
            {
              term: 'Tie',
              description:
                'Both answers are about equally good. A tie counts as half a win for each model.',
            },
            {
              term: 'Both are bad',
              description:
                'Neither answer is good enough to prefer. It is recorded as its own outcome and is not a win for either side.',
            },
          ],
        },
      ],
    },
    {
      id: 'anonymity',
      heading: 'What stays hidden',
      human: 'until you vote',
      blocks: [
        {
          type: 'list',
          items: [
            'Model names are not shown while you read the answers.',
            'The position of each model (A or B) is random for each battle.',
            'The names are revealed after your vote is recorded, never before.',
            'After a vote, the answer you did not prefer may be collapsed. You can show it again at any time.',
          ],
        },
        {
          type: 'callout',
          tone: 'note',
          text: 'Models sometimes name themselves in their own answers. If an answer reveals which model wrote it, you can still vote, but your vote is then less blind. Judge the answer, not the signature.',
        },
      ],
    },
    {
      id: 'rating',
      heading: 'How votes become a rating',
      blocks: [
        {
          type: 'paragraph',
          text: 'The leaderboard uses the Elo rating system, the same idea used to rank chess players. Every model has a rating. A vote is a small match between two models.',
        },
        {
          type: 'paragraph',
          text: 'Before the vote, the system works out how likely each model was to win, based on the gap between their ratings. If model A has rating Ra and model B has rating Rb, the expected score of A is:',
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Expected score',
          text: 'E(A) = 1 / (1 + 10^((Rb - Ra) / 400)), and E(B) = 1 - E(A).',
        },
        {
          type: 'paragraph',
          text: 'After the vote, each rating moves toward the result. The actual score S is 1 for a win, 0 for a loss and 0.5 for a tie. K is a fixed step size that sets how far one vote can move a rating.',
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Rating update',
          text: 'new rating = old rating + K x (S - E)',
        },
        {
          type: 'list',
          items: [
            'An upset moves ratings more than an expected result. Beating a higher-rated model earns more than beating a lower-rated one.',
            'What one model gains, the other loses, so a single vote never adds rating to the system.',
            'Ratings depend on the order of votes. With many votes this evens out, but a model with few battles can move a lot.',
          ],
        },
        {
          type: 'paragraph',
          text: 'The leaderboard shows each model’s rating next to its wins, losses and ties, so you can see how many battles stand behind a number. Treat a rating with few battles as provisional.',
        },
      ],
    },
    {
      id: 'fair-vote',
      heading: 'What counts as a fair vote',
      blocks: [
        {
          type: 'list',
          items: [
            'You read both answers before you vote.',
            'You pick the answer that better does what the prompt asked, not the one that is longer or looks more polished.',
            'You do not try to work out which model wrote which answer, and you do not vote for a model because of its name.',
            'You vote yourself. Votes from scripts or bots are not allowed.',
            'You use Tie when you cannot separate the answers, and Both are bad when neither deserves the win.',
          ],
        },
        {
          type: 'paragraph',
          text: 'Votes that break these rules harm the leaderboard for everyone. We may remove such votes and limit the accounts that cast them. See the Terms for the full acceptable-use rules.',
        },
      ],
    },
    {
      id: 'data',
      heading: 'What happens to your prompts and votes',
      blocks: [
        {
          type: 'paragraph',
          text: 'Your prompt is sent to the two models that answer it. Your prompts, the answers and your votes are stored with your account so you can find your history and so the leaderboard can be calculated. The Privacy Policy lists exactly what is stored and who handles it.',
        },
      ],
    },
  ],
};
