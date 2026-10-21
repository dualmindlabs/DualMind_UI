import type { PageContent } from './types';

export const aboutContent: PageContent = {
  slug: 'about',
  title: 'About DualMind Arena',
  description:
    'DualMind Arena is a place to compare AI models blind, side by side. You vote, and the votes feed a public Elo leaderboard. Built by DualMind Labs.',
  eyebrow: 'About',
  heading: { text: 'Compare AI models,', human: 'blind.' },
  intro:
    'DualMind Arena puts two anonymous AI answers next to each other and asks you to pick the better one. Your votes feed a public Elo leaderboard. It is built by DualMind Labs.',
  sections: [
    {
      id: 'what-it-is',
      heading: 'What it is',
      blocks: [
        {
          type: 'paragraph',
          text: 'You write a prompt. Two models answer it at the same time, without their names. You read both answers, vote, and only then see which model wrote which.',
        },
        {
          type: 'paragraph',
          text: 'Every vote updates the rating of the two models involved. Together the votes make a public leaderboard that shows how models compare on real prompts from real people.',
        },
      ],
    },
    {
      id: 'why-blind',
      heading: 'Why blind comparison',
      human: 'matters',
      blocks: [
        {
          type: 'paragraph',
          text: 'People judge an answer differently when they know who wrote it. A famous name gets the benefit of the doubt. An unknown one has to earn it.',
        },
        {
          type: 'paragraph',
          text: 'Hiding the names until you vote removes that pull. The only thing left to judge is the answer in front of you. That is a fairer test than a benchmark score, and it measures what people actually prefer.',
        },
      ],
    },
    {
      id: 'modes',
      heading: 'Three ways to use it',
      blocks: [
        {
          type: 'definitions',
          items: [
            {
              term: 'Battle',
              description:
                'Two anonymous models answer your prompt. You vote, then the names are revealed. Battle votes count toward the leaderboard.',
            },
            {
              term: 'Side by side',
              description:
                'You pick the two models yourself and read their answers next to each other. Use it to test models you already have in mind.',
            },
            {
              term: 'Direct',
              description:
                'You chat with one model of your choice, like a regular assistant. Your conversations are saved to your history.',
            },
          ],
        },
      ],
    },
    {
      id: 'leaderboard',
      heading: 'How the leaderboard works',
      blocks: [
        {
          type: 'paragraph',
          text: 'The leaderboard ranks models by an Elo rating computed from votes. It also shows each model’s wins, losses and ties. The rating is a summary of many people’s preferences, not a measure of one model being better at everything.',
        },
        {
          type: 'paragraph',
          text: 'The exact method, including the update formula and what counts as a fair vote, is on the [How it works](/how-it-works/#rating) page.',
        },
      ],
    },
    {
      id: 'how-we-run-it',
      heading: 'How the project is',
      human: 'run',
      blocks: [
        {
          type: 'definitions',
          items: [
            {
              term: 'Blind votes',
              description:
                'Model names stay hidden until you have voted, and the order of the two answers is random. Only votes cast on anonymous battles count toward the leaderboard.',
            },
            {
              term: 'Open methodology',
              description:
                'The rating formula, what counts as a fair vote and the known limits of the method are written down on the [How it works](/how-it-works/#rating) page. We change them in public, not quietly.',
            },
            {
              term: 'Privacy',
              description:
                'We store your account, your prompts and the answers, and your votes so the Arena works. There are no analytics, no advertising and no tracking pixels, and we do not sell your data. The details are in the [Privacy Policy](/privacy/).',
            },
          ],
        },
      ],
    },
    {
      id: 'open-source',
      heading: 'What is',
      human: 'open source',
      blocks: [
        {
          type: 'paragraph',
          text: 'The source code of this web app is public on [GitHub](https://github.com/dualmindlabs/DualMind_UI). You can read how the Arena is built, report a problem or suggest a change there.',
        },
        {
          type: 'paragraph',
          text: 'The interface stands on open-source libraries and free-to-use components. Thank you to everyone who made them: the full list, with licenses, is on the [Credits](/credits/) page.',
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Get in',
      human: 'touch',
      blocks: [
        {
          type: 'definitions',
          items: [
            {
              term: 'Help and feedback',
              description: 'support@dualmindlab.tech',
            },
            {
              term: 'Privacy and data deletion',
              description: 'privacy@dualmindlab.tech',
            },
            {
              term: 'Code and bug reports',
              description:
                '[github.com/dualmindlabs/DualMind_UI](https://github.com/dualmindlabs/DualMind_UI)',
            },
          ],
        },
      ],
    },
  ],
};
