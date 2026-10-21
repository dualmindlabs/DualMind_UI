/**
 * The recorded demo battle on the landing page.
 *
 * Shared copy: the prompts, answers and result lines are the same as the waitlist's demo
 * (waitlist-worker/src/content/demo.ts), so both sites say the same thing. Keep them in step.
 *
 * Every answer here was WRITTEN FOR THE DEMO, not produced by a model, and the page says so on
 * screen ("Recorded demo, answers written for illustration"). The demo shows how a battle works;
 * it never claims to be real model output, and it never names a model. After the vote it reveals
 * what each answer was doing instead of a model name.
 */

export type DemoSide = 'a' | 'b';

export interface DemoBattle {
  id: string;
  prompt: string;
  /** The answer that actually answers. */
  crisp: string;
  /** The answer that sounds good and says little. */
  padded: string;
  /** Which side shows the crisp answer. */
  crispSide: DemoSide;
  /** What a careful reader would notice. */
  notice: string;
}

export const DEMO_BATTLES: readonly DemoBattle[] = [
  {
    id: 'benchmarks',
    prompt: 'Why do AI benchmarks stop being useful?',
    crisp:
      'Three reasons. Test questions leak into training data, so a model can score well by memory. Top models crowd the ceiling, so the gaps between them stop meaning much. And once a score becomes the target, teams optimize for the test instead of the skill. Fresh tasks and blind human comparisons hold up longer.',
    padded:
      'AI benchmarks are an important part of how the industry measures progress, and they have played a valuable role over the years. However, as AI evolves rapidly, many factors can affect how useful a benchmark is. Different benchmarks measure different things, and the landscape is always changing. It is important to consider a wide range of perspectives, since no single benchmark can capture everything.',
    crispSide: 'b',
    notice: 'One answer named three causes. The other never said why.',
  },
  {
    id: 'entanglement',
    prompt: 'Explain quantum entanglement simply',
    crisp:
      "Two particles can be linked so that measuring one tells you about the other, however far apart they are. Picture gloves shipped in separate boxes: open one, see a left glove, and you know the other is right. The quantum twist is that neither was decided until you looked. It can't send messages faster than light, but it powers quantum computing and secure encryption.",
    padded:
      'Quantum entanglement is a fascinating and complex phenomenon that has puzzled scientists for decades. In simple terms, it is a special connection between particles. When particles become entangled, they share a kind of relationship, and what happens to one is connected to what happens to the other. It remains one of the most interesting areas of modern physics, with many potential applications in the future of technology.',
    crispSide: 'a',
    notice:
      'The clear one used a picture you can hold and named the limit: no faster-than-light messages.',
  },
  {
    id: 'api',
    prompt: 'Give me a one-line definition of an API',
    crisp:
      'An API is a set of rules that lets one program ask another for data or actions without knowing how it works inside.',
    padded:
      "Great question! An API, which stands for Application Programming Interface, is a very important concept in software development. Generally speaking, an API allows different software applications to communicate and interact with each other, which is extremely useful in today's interconnected digital world, where many systems need to work together seamlessly.",
    crispSide: 'b',
    notice: 'The task asked for one line. Only one answer followed it.',
  },
];

export const RESULT_MESSAGES = {
  crisp:
    'You picked the answer that actually answered. That instinct, repeated across many people and prompts, is what a fair leaderboard is made of.',
  padded:
    'You picked the longer answer. Length and polish can feel like quality, which is exactly why the Arena hides names and lets many votes average out the noise.',
  tie: "A tie is a real answer too. 'Neither is better' is information.",
  bad: 'Sometimes neither model earns the vote, and saying so is part of the signal.',
} as const;

/** What the reveal shows in each pane header instead of a model name. */
export const REVEAL_LABELS = {
  crisp: 'Answered the question',
  padded: 'Sounded good, said little',
} as const;

/** The on-screen label of the demo. */
export const DEMO_LABEL = 'Recorded demo, answers written for illustration';

export const DEMO_DISCLOSURE =
  'Both answers were written for this demo. In the Arena, real models answer and their names appear after you vote.';
