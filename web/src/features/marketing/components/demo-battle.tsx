import { type RefObject, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { RoleBadge } from '@/components/ui/role-badge';

import { DEMO_BATTLES, DEMO_LABEL } from '../content/demo';
import type { DemoBattleControls } from '../hooks/use-demo-battle';
import {
  announcementFor,
  battleAt,
  resultFor,
  revealLabelFor,
  voteForKey,
} from '../lib/demo-machine';
import { AskedNote } from './asked-note';
import { DemoAnswerPane } from './demo-answer-pane';
import { DemoResult } from './demo-result';
import { DemoVoteBar } from './demo-vote-bar';

interface DemoBattleProps {
  demo: DemoBattleControls;
  rootRef: RefObject<HTMLDivElement | null>;
}

const hints = {
  streaming: 'Both answers are appearing.',
  voting: 'Read both, then vote. Keys 1 to 4 work here.',
  revealed: 'In the Arena, the model names appear now.',
} as const;

/**
 * The playable recorded battle: a prompt, two anonymous answers appearing side by side, the
 * verdict row and the reveal. Labelled on screen as a recorded demo with answers written for
 * illustration. Keys 1 to 4 vote while focus is inside it (not in a text field); a polite live
 * region says what changed; focus moves to "Next prompt" after a vote and back to the verdict row
 * for the next battle.
 */
export function DemoBattle({ demo, rootRef }: DemoBattleProps) {
  const { state, shown, words } = demo;
  const battle = battleAt(state.index);
  const streaming = state.phase === 'streaming';
  const revealed = state.phase === 'revealed';
  const resultRef = useRef<HTMLDivElement>(null);
  const votesRef = useRef<HTMLDivElement>(null);
  const focusVotesOnPlay = useRef(false);
  const voteRef = useRef(demo.vote);
  const phaseRef = useRef(state.phase);

  useEffect(() => {
    voteRef.current = demo.vote;
    phaseRef.current = state.phase;
  });

  // Keys 1 to 4 vote while focus is inside the demo (WCAG 2.1.4: scoped, and never in a field).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const choice = voteForKey(event.key);
      if (!choice || phaseRef.current !== 'voting') return;
      event.preventDefault();
      voteRef.current(choice);
    };
    root.addEventListener('keydown', onKeyDown);
    return () => root.removeEventListener('keydown', onKeyDown);
  }, [rootRef]);

  // After a vote, "Next prompt" takes focus (the vote buttons have nothing left to do).
  useEffect(() => {
    if (state.phase !== 'revealed') return;
    resultRef.current?.querySelector<HTMLElement>('[data-demo-next]')?.focus();
  }, [state.phase]);

  // After "Next prompt", focus goes back to the verdict row of the new battle.
  useEffect(() => {
    if (!focusVotesOnPlay.current) return;
    focusVotesOnPlay.current = false;
    votesRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [state.run]);

  const next = () => {
    focusVotesOnPlay.current = true;
    demo.next();
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-labelledby="demo-label"
      tabIndex={-1}
      data-testid="demo-battle"
      data-phase={state.phase}
      data-run={state.run}
      className="relative scroll-mt-28 surface-float rounded-2xl outline-none focus-visible:outline-(length:--focus-width) focus-visible:outline-offset-4 focus-visible:outline-focus focus-visible:outline-solid"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-3 sm:px-6">
        <p id="demo-label" className="flex items-center gap-3 font-mono text-caption text-fg-soft">
          <span aria-hidden="true" className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-mind-a" />
            <span className="size-2.5 rounded-full bg-mind-b" />
          </span>
          {DEMO_LABEL}
        </p>
        <p className="numeric text-caption text-muted">
          Prompt {state.index + 1} of {DEMO_BATTLES.length}
        </p>
      </div>

      <div className="grid gap-5 p-3 sm:gap-6 sm:p-6">
        {state.asked ? <AskedNote prompt={state.asked} /> : null}

        <div className="flex items-start gap-3.5">
          <span aria-hidden="true" className="mt-0.5 inline-flex">
            <RoleBadge who="human" letterOnly />
          </span>
          <div className="min-w-0">
            <p className="eyebrow text-muted">Prompt</p>
            <p
              className="mt-1.5 text-h3 font-medium [overflow-wrap:anywhere] text-fg"
              data-testid="demo-prompt"
            >
              {battle.prompt}
            </p>
          </div>
        </div>

        <div className="relative grid gap-4 md:grid-cols-2 md:gap-5">
          {(['a', 'b'] as const).map(side => (
            <DemoAnswerPane
              key={`${side}-${state.run}`}
              side={side}
              words={words[side]}
              shown={shown[side]}
              streaming={streaming}
              revealed={revealed}
              revealLabel={revealLabelFor(battle, side)}
              chosen={revealed && state.vote === side}
            />
          ))}
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 z-10 hidden size-11 -translate-1/2 place-items-center rounded-full border border-line-strong bg-surface-2 font-mono text-caption font-medium text-fg shadow-float md:grid"
          >
            VS
          </span>
        </div>

        <div>
          <div className="mb-3 flex min-h-9 items-center justify-between gap-3 px-1">
            <p className="text-ui-sm text-muted">{hints[state.phase]}</p>
            {streaming ? (
              <Button variant="ghost" size="sm" onClick={demo.skip}>
                Show all
              </Button>
            ) : null}
          </div>
          <DemoVoteBar
            enabled={state.phase === 'voting'}
            vote={state.vote}
            onVote={demo.vote}
            groupRef={votesRef}
          />
        </div>

        {revealed && state.vote ? (
          <div ref={resultRef}>
            <DemoResult
              vote={state.vote}
              result={resultFor(battle, state.vote)}
              notice={battle.notice}
              onNext={next}
            />
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only" data-testid="demo-announcer">
        {announcementFor(state)}
      </p>
    </div>
  );
}
