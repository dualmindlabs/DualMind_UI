import { ArrowLeftRight, ArrowUp, Square } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  PromptInput,
  PromptInputActions,
  PromptInputTextarea,
} from '@/components/vendor/prompt-kit/prompt-input';
import { cn } from '@/lib/utils/cn';

import { useArena } from '../hooks/use-arena';
import { useDraft } from '../hooks/use-draft';
import { useModelChoices } from '../hooks/use-model-choices';
import { type ModelOption, useModelOptions } from '../hooks/use-model-options';
import { MODE_DETAILS } from '../lib/modes';
import { ModeSwitch } from './mode-switch';
import { ModelPicker } from './model-picker';

/** The models picked in the composer: the Side by side pair and the Direct model (ids). */
export interface ComposerPicks {
  pair: { a: string | null; b: string | null };
  directModel: string | null;
}

/** A random model for an empty Side by side slot, never the one on the other side. */
function randomOther(options: readonly ModelOption[] | undefined, other: ModelOption | null) {
  const pool = (options ?? []).filter(option => option.modelId !== other?.modelId);
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export interface ComposerProps {
  /** Sends the prompt; the arena decides what a send means in each mode. */
  onSend: (prompt: string, picks: ComposerPicks) => void;
  /** Answers are on their way: the send button becomes Stop, and Esc stops. */
  busy?: boolean;
  onStop?: () => void;
  /** `hero`: the empty arena's large, centred composer. `dock`: under an open thread. */
  variant?: 'hero' | 'dock';
  className?: string;
}

/**
 * The prompt box (prompt-kit Prompt Input): the mode switch, the model pickers for Side by side
 * and Direct, a textarea that grows with the text, and Send. Enter or Ctrl/Cmd+Enter sends,
 * Shift+Enter adds a line, Esc stops answers in progress or leaves the box.
 */
export function Composer({
  onSend,
  busy = false,
  onStop,
  variant = 'dock',
  className,
}: ComposerProps) {
  const { mode, selectMode, composerRef, battle } = useArena();
  const followUp = mode === 'battle' && battle.state.turns.some(turn => turn.b?.model);
  const { draft, setDraft } = useDraft();
  const { options } = useModelOptions();
  const choices = useModelChoices(mode === 'battle' ? undefined : options);
  const empty = draft.trim() === '';

  const send = () => {
    if (busy || empty) return;
    // Side by side needs both models: a side left on random gets one now (legacy behaviour).
    const left = choices.left ?? (mode === 'side' ? randomOther(options, choices.right) : null);
    const right = choices.right ?? (mode === 'side' ? randomOther(options, left) : null);
    onSend(draft.trim(), {
      pair: { a: left?.modelId ?? null, b: right?.modelId ?? null },
      directModel: choices.direct?.modelId ?? null,
    });
  };

  return (
    <form
      aria-label="Prompt"
      className={cn('w-full', className)}
      onSubmit={event => {
        event.preventDefault();
        send();
      }}
    >
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={send}
        isLoading={busy}
        textareaRef={composerRef}
        maxHeight={variant === 'hero' ? '16rem' : '12rem'}
        className={cn(variant === 'dock' && 'bg-glass backdrop-blur-md')}
      >
        <PromptInputTextarea
          aria-label="Your prompt"
          placeholder={followUp ? 'Ask a follow-up, same two models' : MODE_DETAILS[mode].placeholder}
          enterKeyHint="send"
          className={cn(variant === 'hero' && 'min-h-16')}
          onKeyDown={event => {
            if (event.key !== 'Escape') return;
            if (busy && onStop) {
              event.preventDefault();
              onStop();
            } else {
              event.currentTarget.blur();
            }
          }}
        />
        <PromptInputActions className="flex-wrap justify-between gap-y-2 px-1 pt-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ModeSwitch value={mode} onChange={selectMode} disabled={busy} />
            {mode === 'side' ? (
              <div className="flex items-center gap-1">
                <ModelPicker
                  side="a"
                  label="Model for answer A"
                  options={options}
                  value={choices.left}
                  onChange={model => choices.choose('left', model)}
                  disabled={busy}
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Swap the two models"
                  onClick={choices.swap}
                  disabled={busy}
                >
                  <ArrowLeftRight aria-hidden="true" strokeWidth={1.75} />
                </Button>
                <ModelPicker
                  side="b"
                  label="Model for answer B"
                  options={options}
                  value={choices.right}
                  onChange={model => choices.choose('right', model)}
                  disabled={busy}
                />
              </div>
            ) : mode === 'direct' ? (
              <ModelPicker
                side="solo"
                label="Model"
                options={options}
                value={choices.direct}
                onChange={model => choices.choose('direct', model)}
                disabled={busy}
              />
            ) : (
              <span className="hidden text-caption text-muted sm:inline">
                Names hidden until you vote
              </span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span aria-hidden="true" className="hidden font-mono text-caption text-muted md:inline">
              Enter to send
            </span>
            {busy ? (
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                aria-label="Stop"
                onClick={onStop}
                className="rounded-full"
              >
                <Square aria-hidden="true" className="size-3.5 fill-current" strokeWidth={1.75} />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon-sm"
                aria-label="Send"
                disabled={empty}
                className="rounded-full"
              >
                <ArrowUp aria-hidden="true" strokeWidth={2} />
              </Button>
            )}
          </div>
        </PromptInputActions>
      </PromptInput>
    </form>
  );
}
