import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { BattlesLeft } from '@/components/ui/battles-left';
import { Button, buttonVariants } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { AccountMenu, LazyMarkdown } from '@/features/arena';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import { useFeatures } from '@/hooks/use-features';
import { useQuota } from '@/hooks/use-quota';
import { useRequireAuth } from '@/hooks/use-require-auth';
import {
  apiKeys,
  getUserMessage,
  PRIVATE_ARENA_MAX_ARENAS,
  type PrivateArena,
  privateArenasQuery,
  type PrivateBattle,
  privateBoardQuery,
  type PrivateVoteChoice,
  type VoteModels,
} from '@/lib/api';
import { resolveDisplayName } from '@/lib/models/display-name';
import { loginUrl } from '@/lib/supabase';

import { nextPromptIndex, parsePrompts, validateArenaName } from '../lib/prompts';

const CARD = 'surface-duel grid content-start gap-4 p-5 sm:p-6';

const CHOICES: ReadonlyArray<{ choice: PrivateVoteChoice; label: string }> = [
  { choice: 'left', label: 'A is better' },
  { choice: 'right', label: 'B is better' },
  { choice: 'tie', label: 'Tie' },
  { choice: 'both_bad', label: 'Both are bad' },
];

type Round =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'voting'; battle: PrivateBattle; index: number }
  | { kind: 'voting-pending'; battle: PrivateBattle; index: number }
  | { kind: 'voted'; battle: PrivateBattle; index: number; models: VoteModels | null }
  | { kind: 'error'; message: string };

function nameOf(model: VoteModels['left'] | undefined): string {
  return model ? resolveDisplayName(model.name, model.displayName) : 'Unknown model';
}

/** Create a prompt set (a name and one prompt per line). */
function CreateArena({
  disabled,
  onCreated,
}: {
  disabled: boolean;
  onCreated: (id: string) => void;
}) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [promptError, setPromptError] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: (input: { name: string; prompts: string[] }) => api.createPrivateArena(input),
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({ queryKey: apiKeys.privateArenas.all });
      setName('');
      setText('');
      onCreated(id);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextNameError = validateArenaName(name);
    const parsed = parsePrompts(text);
    setNameError(nextNameError);
    setPromptError(parsed.error);
    if (nextNameError || parsed.error) return;
    create.mutate({ name: name.trim(), prompts: parsed.prompts });
  };

  return (
    <form noValidate onSubmit={submit} className={CARD} data-testid="private-create">
      <h2 className="text-h3 text-fg">New private arena</h2>
      <Field label="Name" error={nameError}>
        {control => (
          <Input
            {...control}
            dir="auto"
            value={name}
            maxLength={80}
            disabled={disabled || create.isPending}
            onChange={event => setName(event.target.value)}
          />
        )}
      </Field>
      <Field
        label="Prompts"
        description="One prompt per line, up to 50. Do not put secrets or personal data in them."
        error={promptError}
      >
        {control => (
          <Textarea
            {...control}
            rows={6}
            value={text}
            disabled={disabled || create.isPending}
            onChange={event => setText(event.target.value)}
          />
        )}
      </Field>
      {create.isError ? (
        <p role="alert" className="text-ui-sm text-bad">
          {getUserMessage(create.error)}
        </p>
      ) : null}
      <Button type="submit" className="w-fit" disabled={disabled} loading={create.isPending}>
        Create arena
      </Button>
      {disabled ? (
        <p className="text-caption text-muted">
          You have {PRIVATE_ARENA_MAX_ARENAS} private arenas, the most for now. Delete one to make
          another.
        </p>
      ) : null}
    </form>
  );
}

/** Your own results per model, built from your own votes only. */
function Board({ arenaId }: { arenaId: string }) {
  const api = useApiClient();
  const board = useQuery(privateBoardQuery(api, arenaId));
  if (board.isPending) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (board.isError) {
    return (
      <p role="alert" className="text-ui-sm text-bad">
        {getUserMessage(board.error)}
      </p>
    );
  }
  if (board.data.length === 0) {
    return <p className="text-ui-sm text-muted">Your board fills in as you vote.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-ui-sm" data-testid="private-board">
        <caption className="sr-only">Your own results in this arena</caption>
        <thead>
          <tr className="text-left text-caption text-muted">
            <th className="py-2 pr-4 font-medium">Model</th>
            <th className="py-2 pr-4 font-medium">Wins</th>
            <th className="py-2 pr-4 font-medium">Losses</th>
            <th className="py-2 pr-4 font-medium">Ties</th>
            <th className="py-2 font-medium">Battles</th>
          </tr>
        </thead>
        <tbody>
          {board.data.map(row => (
            <tr key={row.model} className="border-t border-line">
              <th scope="row" className="py-2 pr-4 text-left font-medium text-fg">
                {resolveDisplayName(row.model, null)}
              </th>
              <td className="py-2 pr-4">{row.wins}</td>
              <td className="py-2 pr-4">{row.losses}</td>
              <td className="py-2 pr-4">{row.ties}</td>
              <td className="py-2">{row.battles}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One arena: run the next blind battle, vote, see the models, read your board. */
function Runner({ arena, onDeleted }: { arena: PrivateArena; onDeleted: () => void }) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const [round, setRound] = useState<Round>({ kind: 'idle' });
  const [done, setDone] = useState(arena.battlesDone);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const next = nextPromptIndex(done, arena.promptCount);
  const quota = useQuota(true);

  const start = async () => {
    if (next === null || round.kind === 'loading') return;
    setRound({ kind: 'loading' });
    try {
      const battle = await api.startPrivateBattle(arena.id, next);
      setRound({ kind: 'voting', battle, index: next });
      quota.refresh();
    } catch (error) {
      setRound({ kind: 'error', message: getUserMessage(error) });
    }
  };

  const vote = async (choice: PrivateVoteChoice) => {
    if (round.kind !== 'voting') return;
    const { battle, index } = round;
    setRound({ kind: 'voting-pending', battle, index });
    try {
      const models = await api.votePrivateBattle(arena.id, { battleId: battle.battleId, choice });
      setDone(index + 1);
      setRound({ kind: 'voted', battle, index, models });
      await queryClient.invalidateQueries({ queryKey: apiKeys.privateArenas.board(arena.id) });
      await queryClient.invalidateQueries({ queryKey: apiKeys.privateArenas.list() });
    } catch (error) {
      setRound({ kind: 'error', message: getUserMessage(error) });
    }
  };

  const remove = useMutation({
    mutationFn: () => api.deletePrivateArena(arena.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: apiKeys.privateArenas.all });
      onDeleted();
    },
  });

  const battle =
    round.kind === 'voting' || round.kind === 'voting-pending' || round.kind === 'voted'
      ? round.battle
      : null;

  return (
    <section aria-labelledby="runner-title" className={CARD} data-testid="private-runner">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="runner-title" dir="auto" className="text-h3 text-fg">
          {arena.name || 'Private arena'}
        </h2>
        <p className="text-caption text-muted" data-testid="private-progress">
          {Math.min(done, arena.promptCount)} of {arena.promptCount} prompts judged
        </p>
      </div>

      {battle ? (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            {(
              [
                [
                  'A',
                  battle.agent1.text,
                  round.kind === 'voted' ? nameOf(round.models?.left) : null,
                ],
                [
                  'B',
                  battle.agent2.text,
                  round.kind === 'voted' ? nameOf(round.models?.right) : null,
                ],
              ] as const
            ).map(([label, text, model]) => (
              <article
                key={label}
                aria-label={`Answer ${label}`}
                className="grid content-start gap-2 rounded-lg border border-line bg-surface p-4"
              >
                <h3 className="text-caption font-semibold text-fg-soft">
                  Answer {label}
                  {model === null ? null : <span className="text-fg"> · {model}</span>}
                </h3>
                <LazyMarkdown className="answer-prose text-ui-sm text-fg">{text}</LazyMarkdown>
              </article>
            ))}
          </div>
          {round.kind === 'voted' && round.models === null ? (
            <p className="text-ui-sm text-muted">The models were not named for this battle.</p>
          ) : null}
        </div>
      ) : null}

      {round.kind === 'voting' || round.kind === 'voting-pending' ? (
        <div role="group" aria-label="Your vote" className="flex flex-wrap gap-2">
          {CHOICES.map(({ choice, label }) => (
            <Button
              key={choice}
              variant="secondary"
              disabled={round.kind === 'voting-pending'}
              onClick={() => void vote(choice)}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void start()}
            loading={round.kind === 'loading'}
            disabled={next === null}
          >
            {round.kind === 'voted'
              ? 'Next prompt'
              : done > 0
                ? 'Continue'
                : 'Run the first battle'}
          </Button>
          {next === null ? (
            <span className="text-ui-sm text-fg-soft">Every prompt has been judged.</span>
          ) : null}
          {quota.privateArena ? (
            <BattlesLeft
              remaining={quota.privateArena.remaining}
              limit={quota.privateArena.limit}
              noun="private battles"
            />
          ) : null}
        </div>
      )}
      {round.kind === 'error' ? (
        <p role="alert" className="text-ui-sm text-bad">
          {round.message}
        </p>
      ) : null}

      <div className="grid gap-2 border-t border-line pt-4">
        <h3 className="text-ui font-medium text-fg">Your board</h3>
        <p className="text-caption text-muted">Built from your own votes in this arena only.</p>
        <Board arenaId={arena.id} />
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        {confirmDelete ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              loading={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Delete this arena
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            Delete arena
          </Button>
        )}
        {remove.isError ? (
          <span role="alert" className="text-ui-sm text-bad">
            {getUserMessage(remove.error)}
          </span>
        ) : null}
      </div>
    </section>
  );
}

/** The signed-in workspace: your arenas, the creator and the runner. */
function Workspace() {
  const api = useApiClient();
  const arenas = useQuery(privateArenasQuery(api));
  const [selected, setSelected] = useState<string | null>(null);
  const list = arenas.data ?? [];
  const current = list.find(arena => arena.id === selected) ?? list[0] ?? null;

  if (arenas.isPending) {
    return (
      <div aria-busy="true" className="grid gap-4 pt-8">
        <p role="status" className="sr-only">
          Loading your private arenas
        </p>
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }
  if (arenas.isError) {
    return (
      <p role="alert" className="pt-8 text-ui text-bad">
        {getUserMessage(arenas.error)}
      </p>
    );
  }

  return (
    <div className="grid gap-6 pt-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-6">
        {list.length > 1 ? (
          <div role="tablist" aria-label="Your private arenas" className="flex flex-wrap gap-2">
            {list.map(arena => (
              <Button
                key={arena.id}
                role="tab"
                aria-selected={arena.id === current?.id}
                variant={arena.id === current?.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setSelected(arena.id)}
              >
                {arena.name || 'Private arena'}
              </Button>
            ))}
          </div>
        ) : null}
        {current ? (
          <Runner key={current.id} arena={current} onDeleted={() => setSelected(null)} />
        ) : (
          <p className={CARD} data-testid="private-empty">
            You have no private arenas yet. Create one with your own prompts and judge two anonymous
            answers to each.
          </p>
        )}
      </div>
      <div className="grid content-start gap-6">
        <CreateArena disabled={list.length >= PRIVATE_ARENA_MAX_ARENAS} onCreated={setSelected} />
        <aside className={CARD} data-testid="private-pro">
          <p className="text-ui font-medium text-fg">
            Pro <span className="text-muted">(coming soon)</span>
          </p>
          <p className="text-ui-sm text-fg-soft">
            More arenas, bigger prompt sets and sharing with a team. Nothing to buy today: private
            arenas are free while they are in testing.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <div className="max-w-reading pt-10" data-testid="private-notice">
      <div className={CARD}>
        <h2 className="text-h3 text-fg">{title}</h2>
        <p className="text-ui text-fg-soft">{children}</p>
      </div>
    </div>
  );
}

/** Needs a session: a signed-out visitor goes to sign in and comes back here. */
function SignedInGate() {
  const status = useRequireAuth();
  const { user } = useAuth();
  if (status === 'signed-in' && user) return <Workspace />;
  if (status === 'loading') {
    return (
      <div aria-busy="true" className="pt-8">
        <p role="status" className="sr-only">
          Loading
        </p>
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }
  return (
    <div className="max-w-reading pt-10">
      <div className={CARD}>
        <h2 className="text-h3 text-fg">
          {status === 'unavailable'
            ? 'Sign-in is unavailable here'
            : 'Sign in to use private arenas'}
        </h2>
        {status === 'unavailable' ? null : (
          <a
            href={loginUrl('/private/', window.location.origin)}
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            Sign in
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * `/private/` (behind VITE_FEATURE_PRIVATE_ARENA and the backend's `privateArena` flag, off by
 * default): your own prompt set, blind battles on it that only you vote on, and a board built from
 * your own votes. Free while it is in testing; the "Pro (coming soon)" note is all there is of
 * billing.
 */
export function PrivateArenaPage() {
  const features = useFeatures();
  const { status } = useAuth();

  let content;
  if (features.loading) {
    content = <Skeleton className="mt-8 h-40 w-full rounded-lg" />;
  } else if (!features.privateArena) {
    content = (
      <Notice title="Private arenas are not open yet">
        You can run blind battles on your own prompts here once they open. Until then, the public
        Arena works as always.
      </Notice>
    );
  } else {
    content = <SignedInGate />;
  }

  return (
    <>
      <SkipLink />
      <SiteHeader
        variant="app"
        activePath="/private/"
        account={status === 'signed-in' ? <AccountMenu /> : undefined}
      />
      <main id="main" tabIndex={-1} className="outline-none" data-testid="private-page">
        <PageContainer className="pt-10 pb-20 md:pt-14 md:pb-28">
          <header className="grid gap-3">
            <p className="kicker text-mind-a">Your prompts</p>
            <h1 className="text-h1 text-fg">Private arena</h1>
            <p className="max-w-reading text-lead text-fg-soft">
              Your own prompt set, two anonymous answers to each, and a board that only you can see.
            </p>
          </header>
          {content}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}
