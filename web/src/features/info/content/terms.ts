import type { PageContent } from './types';

export const termsContent: PageContent = {
  slug: 'terms',
  title: 'Terms of Service',
  description:
    'The rules for using DualMind Arena: accounts, acceptable use, your content, model outputs, warranty and liability. Written in plain language.',
  eyebrow: 'Legal',
  heading: { text: 'Terms of Service,', human: 'plainly.' },
  intro:
    'These terms apply when you use DualMind Arena ("the Service"). By using it you agree to them. If you do not agree, please do not use the Service.',
  updated: '2026-10-20',
  sections: [
    {
      id: 'summary',
      heading: 'Summary',
      blocks: [
        {
          type: 'callout',
          tone: 'summary',
          title: 'The short version',
          text: 'Use the Arena honestly: vote yourself, do not try to game the leaderboard, and do not break the law. You own your prompts and let us use them to run the Service. Models can be wrong, so check what matters. The Service comes without warranty, and our liability is limited as far as the law allows.',
        },
      ],
    },
    {
      id: 'service',
      heading: 'The Service',
      blocks: [
        {
          type: 'paragraph',
          text: 'DualMind Arena lets you compare AI language models in blind Battles, in Side by side comparisons and in Direct chat. It stores your conversation history, records your votes, and publishes a leaderboard computed from votes. Some features may change or be unavailable at times.',
        },
      ],
    },
    {
      id: 'accounts',
      heading: 'Your account',
      blocks: [
        {
          type: 'list',
          items: [
            'Give accurate information when you sign up.',
            'Keep your login details safe and tell us if someone uses your account without permission.',
            'You are responsible for what happens under your account.',
            'You must be at least 13 years old.',
          ],
        },
      ],
    },
    {
      id: 'acceptable-use',
      heading: 'Acceptable use',
      blocks: [
        {
          type: 'paragraph',
          text: 'You agree not to:',
        },
        {
          type: 'list',
          items: [
            'break the law or infringe other people’s rights, or submit unlawful content;',
            'use the Service to harass, abuse or threaten anyone, or to produce content that exploits or endangers children;',
            'vote with scripts, bots or any other automation, or create several accounts to vote more than once;',
            'try to work out which model wrote which answer, for example with prompts that make a model reveal its name, in order to steer votes toward or against a model;',
            'coordinate votes to push a model up or down the leaderboard;',
            'probe, overload, scrape or attack the Service, or try to get into accounts or systems that are not yours;',
            'resell access to the Service.',
          ],
        },
        {
          type: 'paragraph',
          text: 'We may remove votes that break these rules and suspend or close accounts that do.',
        },
      ],
    },
    {
      id: 'your-content',
      heading: 'Your content',
      blocks: [
        {
          type: 'paragraph',
          text: 'You keep ownership of the prompts you submit. You give us a worldwide, non-exclusive, royalty-free license to store, process and display them, and the answers to them, as needed to run the Service: to show you your history, to share a conversation when you choose to, and to calculate the leaderboard.',
        },
        {
          type: 'paragraph',
          text: 'You promise that you have the right to submit what you submit. Do not submit material that you are not allowed to share.',
        },
        {
          type: 'paragraph',
          text: 'The Service itself, including its design and software, belongs to DualMind Labs or its licensors.',
        },
      ],
    },
    {
      id: 'model-outputs',
      heading: 'Model outputs',
      blocks: [
        {
          type: 'paragraph',
          text: 'Answers come from AI models run by third-party providers. They can be wrong, out of date, biased or offensive, and two answers to one prompt can contradict each other. We do not check them. Do not rely on them for medical, legal, financial or safety decisions without checking with a qualified person.',
        },
        {
          type: 'paragraph',
          text: 'We do not claim ownership of model outputs. Each provider’s own terms may set limits on how you use them.',
        },
      ],
    },
    {
      id: 'third-parties',
      heading: 'Third-party services',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service relies on providers for sign-in, hosting and the models themselves. We are not responsible for their availability or accuracy. The Privacy Policy explains what data each one handles.',
        },
      ],
    },
    {
      id: 'warranty',
      heading: 'No warranty',
      blocks: [
        {
          type: 'paragraph',
          text: 'The Service is provided "as is" and "as available". We do not promise that it will be uninterrupted, secure or free of errors, or that the leaderboard is accurate or complete.',
        },
      ],
    },
    {
      id: 'liability',
      heading: 'Limitation of liability',
      blocks: [
        {
          type: 'paragraph',
          text: 'To the maximum extent the law allows, DualMind Labs is not liable for indirect, incidental, special, consequential or punitive damages arising from your use of the Service, including loss of data or profits. Nothing in these terms limits liability that cannot be limited by law.',
        },
      ],
    },
    {
      id: 'changes',
      heading: 'Changes and ending',
      blocks: [
        {
          type: 'paragraph',
          text: 'We may change the Service or these terms. If a change is material, we will update the date above and tell signed-in users in the app. Using the Service after a change means you accept it.',
        },
        {
          type: 'paragraph',
          text: 'You can stop using the Service and ask us to delete your account at any time, by writing to privacy@dualmindlab.tech. We may suspend or end your access if you break these terms or misuse the Service.',
        },
      ],
    },
    {
      id: 'governing-law',
      heading: 'Governing law',
      blocks: [
        {
          type: 'paragraph',
          text: 'These Terms are governed by the laws of India. Any dispute arising from these Terms or your use of the Service is subject to the exclusive jurisdiction of the courts in India.',
        },
        {
          type: 'paragraph',
          text: 'If any part of these terms is found unenforceable, the rest stays in force.',
        },
      ],
    },
    {
      id: 'contact',
      heading: 'Contact',
      blocks: [
        {
          type: 'list',
          items: [
            'General questions: support@dualmindlab.tech',
            'Privacy and data requests: privacy@dualmindlab.tech',
          ],
        },
      ],
    },
  ],
};
