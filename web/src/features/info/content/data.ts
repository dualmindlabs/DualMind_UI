import type { PageContent } from './types';

/**
 * /data/: what a reader, a researcher or a crawler may do with DualMind Arena data. The rule that
 * matters: the license is split. Aggregate numbers are ours to license; model answers are not
 * (they are the providers' output, under the providers' terms), so no page here says CC BY for
 * them. The Content-Signal values are the ones build.js writes into robots.txt (a test pins both).
 */
export const dataContent: PageContent = {
  slug: 'data',
  title: 'Data license',
  description:
    'What you may do with DualMind Arena data: leaderboard numbers under CC BY 4.0, prompts only with consent, model answers under each provider’s own terms.',
  eyebrow: 'Data',
  heading: { text: 'Our data,', human: 'and what you may do with it.' },
  intro:
    'There are three kinds of data here, and they are licensed differently on purpose. We can license our own numbers. We cannot license what the AI providers’ models wrote.',
  updated: '2026-11-26',
  sections: [
    {
      id: 'summary',
      heading: 'Summary',
      blocks: [
        {
          type: 'callout',
          tone: 'summary',
          title: 'The short version',
          text: 'Leaderboard numbers: CC BY 4.0, with credit. Prompts: none are published today, and if some ever are, only from people who agreed, under CC BY 4.0. Model answers: not ours to license, so each provider’s own terms apply, and we offer them for analysis and evaluation only. Search engines and AI assistants may read this site to answer questions. We ask AI developers not to train on it.',
        },
      ],
    },
    {
      id: 'leaderboard-numbers',
      heading: 'Leaderboard numbers',
      blocks: [
        {
          type: 'paragraph',
          text: 'The aggregate numbers we compute (each model’s rating, rank, wins, losses, ties, win rate and battle count) are licensed under Creative Commons Attribution 4.0 International (CC BY 4.0). They appear on the leaderboard page, in the leaderboard Markdown file and in the public JSON of the API.',
        },
        {
          type: 'paragraph',
          text: 'You may copy, chart and republish them, including commercially, if you credit “DualMind Arena (arena.dualmindlab.tech)”, link to the leaderboard and say when you read the numbers. The ratings are under audit while we check them against the recorded votes, so please do not present them as settled.',
        },
      ],
    },
    {
      id: 'prompts',
      heading: 'Prompts',
      blocks: [
        {
          type: 'paragraph',
          text: 'We do not publish any prompts today. The Terms of Service license your prompts to us only as needed to run the Service.',
        },
        {
          type: 'paragraph',
          text: 'If we ever release a set of prompts, it will contain only prompts from people who opted in, with personal information removed, under CC BY 4.0, and you will be able to ask for yours to be taken out. We will say so here before we do it.',
        },
      ],
    },
    {
      id: 'model-answers',
      heading: 'Model answers',
      blocks: [
        {
          type: 'callout',
          tone: 'warning',
          title: 'Not CC BY',
          text: 'The answers are written by models run by other companies. We do not own them, so we cannot license them, and nothing on this site gives them a Creative Commons license.',
        },
        {
          type: 'list',
          items: [
            'The terms of the provider that runs each model decide what you may do with its answers. Read them before you reuse an answer.',
            'Where we show or share answers, it is for analysis and evaluation: reading, comparing, and checking how the ratings came about.',
            'If we ever release a dataset that includes answers, access will need an accepted agreement, and it will repeat this limit.',
          ],
        },
      ],
    },
    {
      id: 'ai-use',
      heading: 'Search engines and AI assistants',
      blocks: [
        {
          type: 'paragraph',
          text: 'Our robots.txt carries a Content-Signal line: search=yes, ai-input=yes, ai-train=no. That means indexing for search and quoting in an AI answer are welcome, and using the site to train AI models is not. A signal is a request that well-behaved crawlers follow. It is not a technical block and it does not change the licenses above.',
        },
        {
          type: 'paragraph',
          text: 'The /llms.txt file lists the pages and files meant for machines: the leaderboard as Markdown and JSON, the API description, this page and the methodology.',
        },
      ],
    },
    {
      id: 'removal',
      heading: 'Asking us to remove something',
      blocks: [
        {
          type: 'paragraph',
          text: 'To have a prompt, a conversation or an account removed, or to report a license problem, write to support@dualmindlab.tech. Say what you want removed and from which account or link. The Privacy Policy explains how long we keep data and your other rights.',
        },
      ],
    },
  ],
};
