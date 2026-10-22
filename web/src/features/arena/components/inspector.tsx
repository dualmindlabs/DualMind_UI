import { PanelRight } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { resolveDisplayName } from '@/lib/models/display-name';

import { useArena } from '../hooks/use-arena';
import { type LiveAnswer, type LiveTurn, namesShown } from '../lib/battle-machine';
import { MODE_DETAILS } from '../lib/modes';
import { paneMetrics } from '../lib/turns';

interface InspectorState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const InspectorContext = createContext<InspectorState | null>(null);

function editable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * Where the inspector's open state lives. It starts closed, always: the stage keeps the whole
 * width until someone asks for the numbers. `I` toggles it outside text fields while the single
 * key shortcuts are on (and never while a dialog is open).
 */
export function InspectorProvider({ children }: { children: ReactNode }) {
  const { shortcutsEnabled } = useArena();
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(value => !value), []);

  useEffect(() => {
    if (!shortcutsEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'i' && event.key !== 'I') return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (editable(event.target)) return;
      if (!open && document.querySelector('[aria-modal="true"], [role="menu"]')) return;
      event.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcutsEnabled, open, toggle]);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

/** The button that opens and closes the inspector (the stage toolbar). */
export function InspectorToggle() {
  const state = useContext(InspectorContext);
  const { shortcutsEnabled } = useArena();
  if (!state) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-expanded={state.open}
      aria-haspopup="dialog"
      aria-keyshortcuts={shortcutsEnabled ? 'I' : undefined}
      onClick={state.toggle}
    >
      <PanelRight aria-hidden="true" strokeWidth={1.75} />
      <span className="max-sm:sr-only">Inspector</span>
      {shortcutsEnabled ? (
        <Kbd aria-hidden="true" className="hidden h-5 min-w-5 sm:inline-flex">
          I
        </Kbd>
      ) : null}
    </Button>
  );
}

function name(answer: LiveAnswer | null): string {
  const model = answer?.model;
  return model ? resolveDisplayName(model.name, model.displayName) : 'Unknown model';
}

const PHASES: Record<LiveTurn['phase'], string> = {
  submitting: 'Picking two models',
  answering: 'Writing',
  awaiting_vote: 'Waiting for your vote',
  voting: 'Sending your vote',
  revealed: 'Revealed',
  error: 'Failed',
  stopped: 'Stopped',
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2.5 border-b border-line px-5 py-4 last:border-b-0">
      <h3 className="font-mono text-caption font-medium text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Row({ term, value }: { term: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-ui-sm">
      <dt className="text-fg-soft">{term}</dt>
      <dd className="min-w-0 text-right font-medium [overflow-wrap:anywhere] text-fg">{value}</dd>
    </div>
  );
}

const KEYS: ReadonlyArray<readonly [string, string]> = [
  ['1', 'A is better'],
  ['2', 'B is better'],
  ['3', 'Tie'],
  ['4', 'Both are bad'],
  ['/', 'Prompt box'],
  ['N', 'New battle'],
  ['[', 'History'],
  ['I', 'This inspector'],
];

/**
 * The right-hand inspector: everything about the battle that is not the battle. It is closed
 * until asked for, so the duel keeps the stage. It lists the state of the newest turn, the
 * numbers of each answer once the names may be shown (before the vote they would hint at the
 * models, and the panel says so), and the keys.
 */
export function InspectorPanel({ turn }: { turn: LiveTurn | undefined }) {
  const state = useContext(InspectorContext);
  const { mode, battle, shortcutsEnabled } = useArena();
  if (!state) return null;
  const shown = turn ? namesShown(turn) : false;
  const answers = turn
    ? [
        { side: 'A', answer: turn.a },
        { side: 'B', answer: turn.b },
      ].flatMap(item => (item.answer === null ? [] : [{ side: item.side, answer: item.answer }]))
    : [];
  const waiting = turn?.phase === 'submitting' || turn?.phase === 'answering';

  return (
    <Sheet open={state.open} onOpenChange={state.setOpen}>
      <SheetContent
        side="right"
        className="w-[min(100%-3rem,24rem)] gap-0 overflow-y-auto border-line-strong bg-surface p-0 shadow-float"
      >
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line pr-14 pl-5">
          <PanelRight aria-hidden="true" className="size-4 text-muted" strokeWidth={1.75} />
          <SheetTitle className="text-ui font-semibold">Inspector</SheetTitle>
        </div>
        <SheetDescription className="sr-only">
          Details of this battle: its state, the numbers of each answer and the keyboard keys.
        </SheetDescription>
        <Section title="Battle">
          <dl className="grid gap-2">
            <Row term="Mode" value={MODE_DETAILS[mode].label} />
            <Row term="Turns this session" value={battle.state.turns.length} />
            {turn ? <Row term="Now" value={PHASES[turn.phase]} /> : null}
            {battle.pendingVotes > 0 ? (
              <Row term="Votes waiting to send" value={battle.pendingVotes} />
            ) : null}
          </dl>
        </Section>
        <Section title="Answers">
          {turn === undefined || answers.length === 0 ? (
            <p className="text-ui-sm text-fg-soft">Send a prompt and the numbers show up here.</p>
          ) : !shown || waiting ? (
            <p className="text-ui-sm text-fg-soft" data-testid="inspector-hidden">
              {shown
                ? 'The numbers appear once both answers have finished.'
                : 'Time, length and tokens appear after your vote. Before it they could hint at which model wrote what.'}
            </p>
          ) : (
            answers.map(({ side, answer }) => (
              <div key={side} className="grid gap-2">
                <p className="text-ui-sm font-semibold text-fg">
                  {side} <span className="font-normal text-fg-soft">{name(answer)}</span>
                </p>
                <dl className="grid gap-1.5 font-mono">
                  {paneMetrics({
                    text: answer.text,
                    timeMs: answer.responseTimeMs,
                    tokens: answer.usage?.completionTokens,
                  }).map(([term, value]) => (
                    <Row key={term} term={term} value={value} />
                  ))}
                </dl>
              </div>
            ))
          )}
        </Section>
        {shortcutsEnabled ? (
          <Section title="Keys">
            <ul className="grid gap-2">
              {KEYS.map(([key, label]) => (
                <li key={key} className="flex items-center justify-between text-ui-sm">
                  <span className="text-fg-soft">{label}</span>
                  <Kbd>{key}</Kbd>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
