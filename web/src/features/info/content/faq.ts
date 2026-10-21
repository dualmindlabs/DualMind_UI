import type { PageContent } from './types';

export const faqContent: PageContent = {
  slug: 'faq',
  title: 'Frequently asked questions',
  description:
    'Answers about accounts, models, anonymous voting, ties, sharing, your data and how to reach us. Plain answers about how DualMind Arena works today.',
  eyebrow: 'FAQ',
  heading: { text: 'Questions,', human: 'answered.' },
  intro:
    'Short answers about how DualMind Arena works today. If yours is missing, write to support@dualmindlab.tech.',
  sections: [
    {
      id: 'basics',
      heading: 'The basics',
      blocks: [
        {
          type: 'faq',
          question: 'What is DualMind Arena?',
          answer: [
            'A place to compare AI models blind. You send one prompt, two models answer without their names, and you vote for the better answer. The votes feed a public Elo leaderboard.',
          ],
        },
        {
          type: 'faq',
          question: 'Do I need an account?',
          answer: [
            'Yes, to battle and to vote. Signing up needs an email address; a name and a phone number are optional. With an account you can keep a history of your conversations, share a thread, and have your votes count toward the leaderboard.',
          ],
        },
        {
          type: 'faq',
          question: 'Is it free?',
          answer: [
            'Creating an account and using the Arena costs nothing today. If that changes, we will say so on this site before it does.',
          ],
        },
        {
          type: 'faq',
          question: 'Which models can I compare?',
          answer: [
            'The model picker shows the models available right now, and the Models page lists them. The list changes as models are added or retired, so we do not keep a fixed list here.',
            'You can suggest a model by writing to support@dualmindlab.tech. We cannot promise to add it: it depends on whether we can get reliable access to it.',
          ],
        },
      ],
    },
    {
      id: 'voting',
      heading: 'Voting and ratings',
      blocks: [
        {
          type: 'faq',
          question: 'Why are the models anonymous?',
          answer: [
            'Knowing the name changes how people judge an answer. Hiding it until you vote makes the vote about the answer only. The names appear as soon as your vote is recorded.',
          ],
        },
        {
          type: 'faq',
          question: 'What do the four vote buttons mean?',
          answer: [
            'A is better and B is better pick a winner. Tie means you cannot separate the answers. Both are bad means neither answer is good enough to prefer.',
          ],
        },
        {
          type: 'faq',
          question: 'Why does "Both are bad" exist?',
          answer: [
            'Sometimes both models fail. Forcing a pick would turn a poor answer into a win and add noise to the rating. "Both are bad" records that neither deserved it.',
          ],
        },
        {
          type: 'faq',
          question: 'How do ties work?',
          answer: [
            'A tie is treated as half a win for each model in the Elo calculation. Ties and wins are counted separately on the leaderboard.',
          ],
        },
        {
          type: 'faq',
          question: 'How is the leaderboard calculated?',
          answer: [
            'Each vote updates the Elo ratings of the two models in that battle. The leaderboard shows the resulting rating, with wins, losses and ties. The formula is explained on the How it works page.',
          ],
        },
        {
          type: 'faq',
          question: 'Can I change a vote after I cast it?',
          answer: [
            'No. One vote is recorded for each battle, and the names are revealed once you cast it.',
          ],
        },
      ],
    },
    {
      id: 'your-conversations',
      heading: 'Your conversations',
      blocks: [
        {
          type: 'faq',
          question: 'Can I see my history?',
          answer: [
            'Yes. Your recent conversations are listed in the sidebar when you are signed in. You can reopen, rename or delete them.',
          ],
        },
        {
          type: 'faq',
          question: 'Can I share a battle?',
          answer: [
            'Yes. Open the share menu on a conversation to make it viewable by link. Anyone with the link can read it. A conversation stays private until you share it, and you can switch it back to private later.',
            'You can also download all your conversations from Settings as Markdown, JSON, CSV, HTML or PDF.',
          ],
        },
        {
          type: 'faq',
          question: 'How do I delete my data?',
          answer: [
            'You can delete any conversation from the sidebar. To delete your account and the data tied to it, write to privacy@dualmindlab.tech from the email address you signed up with. The Privacy Policy explains what we keep and for how long.',
          ],
        },
      ],
    },
    {
      id: 'privacy-and-contact',
      heading: 'Privacy and contact',
      blocks: [
        {
          type: 'faq',
          question: 'What do you do with my data?',
          answer: [
            'We store your account details, your prompts and the answers, and your votes. We use them to run the Arena, show you your history and calculate the leaderboard. We do not run analytics or advertising on the site and we do not sell your data.',
            'Your prompts are sent to the model providers so they can answer. The Privacy Policy has the full list.',
          ],
        },
        {
          type: 'faq',
          question: 'What if I see harmful or wrong content?',
          answer: [
            'Models can get things wrong and sometimes produce content you will not like. Check anything important yourself. To report something, write to support@dualmindlab.tech.',
          ],
        },
        {
          type: 'faq',
          question: 'How do I contact you?',
          answer: [
            'For help or feedback, write to support@dualmindlab.tech. For anything about your personal data, write to privacy@dualmindlab.tech.',
          ],
        },
      ],
    },
  ],
};
