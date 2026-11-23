import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AnswerKeyRow } from '@/features/arena/components/answer-key-row';
import { CrossExamineSlot } from '@/features/arena/components/cross-examine-strip';
import { RebuttalNote } from '@/features/arena/components/rebuttal-note';
import { type LiveTurn, NO_CROSS_EXAMINE } from '@/features/arena/lib/battle-machine';
import { ApiClientContext } from '@/hooks/use-api-client';
import { type AnswerKey, createApiClient } from '@/lib/api';

import { jsonResponse, scriptedFetch } from '../../lib/api/helpers';
import { FakeArena, fakeBattle } from './arena-context';

const KEY: AnswerKey = {
  question: 'What is 17 x 23?',
  answer: '391',
  grader: 'numeric',
  sample: false,
  sides: [
    { slot: 1, correct: true, extracted: '391' },
    { slot: 2, correct: false, extracted: '401' },
  ],
};

const turn = (overrides: Partial<LiveTurn> = {}): LiveTurn => ({
  id: 't',
  prompt: 'q',
  mode: 'battle',
  phase: 'revealed',
  a: null,
  b: null,
  comparisonId: 'c-1',
  unrated: null,
  vote: 'left',
  votePending: false,
  receipt: null,
  answerKey: null,
  evalQuestion: false,
  crossExamine: NO_CROSS_EXAMINE,
  error: null,
  errorKind: null,
  sentAt: 0,
  answeredAt: 1,
  shownAt: 2,
  ...overrides,
});

describe('AnswerKeyRow', () => {
  it('shows the key and, per side, a words-and-icon verdict (not colour alone)', () => {
    render(<AnswerKeyRow answerKey={KEY} />);
    expect(screen.getByRole('heading', { name: 'Answer key' })).toBeInTheDocument();
    expect(screen.getByTestId('answer-key-answer')).toHaveTextContent('391');
    const a = screen.getByTestId('answer-key-side-a');
    const b = screen.getByTestId('answer-key-side-b');
    expect(a).toHaveTextContent('Answer A: matched the key');
    expect(a).toHaveTextContent('read as 391');
    expect(b).toHaveTextContent('Answer B: did not match the key');
    expect(a).toHaveAttribute('data-correct');
    expect(b).not.toHaveAttribute('data-correct');
    expect(a.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('has no emoji', () => {
    const { container } = render(<AnswerKeyRow answerKey={{ ...KEY, sample: true }} />);
    expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(screen.getByText('Sample question')).toBeInTheDocument();
  });

  it('skips a side the key does not list', () => {
    render(<AnswerKeyRow answerKey={{ ...KEY, sides: [KEY.sides[0]!] }} />);
    expect(screen.queryByTestId('answer-key-side-b')).not.toBeInTheDocument();
  });
});

describe('RebuttalNote', () => {
  it('names the critic and renders the text as plain text, never as markup', () => {
    const { container } = render(
      <RebuttalNote
        critic="Model B"
        rebuttal={{
          slot: 2,
          modelName: 'm',
          displayName: 'Model B',
          rebuttal: '<img src=x onerror=alert(1)> [link](https://evil.test) **bold**',
          words: 5,
        }}
      />,
    );
    expect(screen.getByRole('complementary', { name: 'Rebuttal by Model B' })).toBeInTheDocument();
    expect(container.querySelector('img, a, strong')).toBeNull();
    expect(container).toHaveTextContent('**bold**');
    expect(container).toHaveTextContent('5 words');
  });
});

function slot(
  replies: Parameters<typeof scriptedFetch>,
  live: LiveTurn,
  battle = fakeBattle([live]),
) {
  const { fetch, calls } = scriptedFetch(...replies);
  const client = createApiClient({ fetch, getAccessToken: () => 'token' });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={client}>
        <FakeArena overrides={{ battle }}>
          <CrossExamineSlot turn={live} />
        </FakeArena>
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
  return { calls, battle };
}

const ON = jsonResponse({ Enabled: true, Overall: { Rounds: 50, Flips: 10, FlipRate: 0.2 } });

describe('CrossExamineSlot', () => {
  it('shows nothing while the backend has cross-examine off', async () => {
    const { calls } = slot([jsonResponse({ code: 'FEATURE_DISABLED' }, { status: 404 })], turn());
    await waitFor(() => expect(calls).toHaveLength(1));
    expect(screen.queryByTestId('cross-examine')).not.toBeInTheDocument();
  });

  it('shows nothing, and asks nothing, without a saved vote or while the vote is queued', () => {
    const queued = slot([ON], turn({ votePending: true }));
    expect(queued.calls).toHaveLength(0);
    expect(screen.queryByTestId('cross-examine')).not.toBeInTheDocument();
  });

  it('with it on, offers the critique and says the first vote already counted', async () => {
    const user = userEvent.setup();
    const { battle } = slot([ON], turn());
    const strip = await screen.findByTestId('cross-examine');
    expect(strip).toHaveTextContent('Your first vote has already counted');
    await user.click(within(strip).getByRole('button', { name: 'Ask for the critique' }));
    expect(battle.critique).toHaveBeenCalledWith('t');
  });

  it('after the critique, offers an optional second vote that is kept apart', async () => {
    const user = userEvent.setup();
    const ready = turn({
      crossExamine: { ...NO_CROSS_EXAMINE, critique: 'ready' },
    });
    const { battle } = slot([ON], ready);
    const group = await screen.findByRole('group', { name: 'Vote again, optional' });
    expect(group).toHaveTextContent('kept apart from your first vote');
    await user.click(within(group).getByRole('button', { name: 'Tie' }));
    expect(battle.secondVote).toHaveBeenCalledWith('t', 'tie');
  });

  it('says what the second vote did, with the crowd number once there are enough rounds', async () => {
    const done = turn({
      crossExamine: {
        ...NO_CROSS_EXAMINE,
        critique: 'ready',
        round2: 'done',
        round2Choice: 'right',
        flipped: true,
      },
    });
    slot([ON], done);
    const outcome = await screen.findByTestId('cross-examine-outcome');
    expect(outcome).toHaveTextContent('You changed your vote to "B is better".');
    expect(outcome).toHaveTextContent('20% of voters changed their vote');
  });

  it('shows the error and a retry when the critique fails', async () => {
    const failed = turn({
      crossExamine: {
        ...NO_CROSS_EXAMINE,
        critique: 'failed',
        critiqueMessage: 'The models could not write a critique.',
      },
    });
    slot([ON], failed);
    expect(await screen.findByTestId('critique-error')).toHaveTextContent('could not write');
    expect(screen.getByRole('button', { name: 'Try the critique again' })).toBeInTheDocument();
  });
});

describe('the reveal without an API', () => {
  it('renders no cross-examine at all (the slot needs the client)', () => {
    render(
      <FakeArena overrides={{ battle: fakeBattle([turn()]) }}>
        <CrossExamineSlot turn={turn()} />
      </FakeArena>,
    );
    expect(screen.queryByTestId('cross-examine')).not.toBeInTheDocument();
    expect(vi.isMockFunction(fakeBattle().critique)).toBe(true);
  });
});
