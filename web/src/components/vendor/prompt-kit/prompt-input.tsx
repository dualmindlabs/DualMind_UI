/**
 * Prompt Input, from prompt-kit by ibelick (Julien Thibeaut).
 * Source: https://www.prompt-kit.com/c/prompt-input.json (copied 2026-10-21)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - Our tokens and the 20px composer radius; the focus ring is drawn on the card while the
 *   textarea inside has focus (the textarea itself keeps no outline of its own).
 * - Keys: Enter sends (Shift+Enter is a new line), Ctrl+Enter or Cmd+Enter always sends, and
 *   nothing is sent while an input method is composing (Japanese, Chinese, Korean...). With
 *   `submitOn="mod-enter"` (a setting) only Ctrl/Cmd+Enter sends and Enter adds a line.
 * - The card focuses the textarea on a pointer press on its empty area, without a click handler
 *   on a non-interactive element (keyboard users reach the textarea directly).
 * - Auto-grow from one line up to `maxHeight`, re-measured when the value changes from outside
 *   (a prompt starter, a cleared composer).
 * - Removed: the tooltip action wrapper and its own TooltipProvider (the root mounts one).
 */
import {
  type ComponentProps,
  createContext,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react';

import { cn } from '@/lib/utils/cn';

interface PromptInputContextValue {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit: (() => void) | undefined;
  disabled: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  submitOn: SubmitOn;
}

/** `enter`: Enter or Ctrl/Cmd+Enter sends. `mod-enter`: only Ctrl/Cmd+Enter sends. */
export type SubmitOn = 'enter' | 'mod-enter';

const PromptInputContext = createContext<PromptInputContextValue | null>(null);

function usePromptInput(): PromptInputContextValue {
  const context = useContext(PromptInputContext);
  if (!context) throw new Error('PromptInputTextarea must be inside <PromptInput>.');
  return context;
}

export type PromptInputProps = {
  isLoading?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  /** A number of pixels or a CSS length. Default 240px. */
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: ReactNode;
  disabled?: boolean;
  /** Lets the caller focus or measure the textarea (the arena's `/` shortcut, starters). */
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Which key sends; default `enter`. */
  submitOn?: SubmitOn;
} & Omit<ComponentProps<'div'>, 'onSubmit'>;

/** The composer card: a textarea that grows with its text, and a row of actions under it. */
export function PromptInput({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
  disabled = false,
  textareaRef: externalRef,
  submitOn = 'enter',
  onPointerDown,
  ...props
}: PromptInputProps) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = externalRef ?? internalRef;

  // A press on the card's empty area (padding, the gap between the rows) focuses the textarea,
  // like a click on a text field's label. Presses on buttons, links and fields keep their focus.
  const focusTextarea = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event);
    if (disabled || event.defaultPrevented) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [role="combobox"], [tabindex]')) {
      return;
    }
    event.preventDefault();
    textareaRef.current?.focus();
  };

  return (
    <PromptInputContext.Provider
      value={{
        isLoading,
        value,
        setValue: onValueChange,
        maxHeight,
        onSubmit,
        disabled,
        textareaRef,
        submitOn,
      }}
    >
      <div
        data-slot="prompt-input"
        data-disabled={disabled ? '' : undefined}
        className={cn(
          'cursor-text rounded-xl border border-line-strong bg-surface-2 p-2 shadow-raise-strong',
          'transition-[border-color,box-shadow] duration-(--dur-fast) ease-out-expo hover:border-fg-soft',
          'has-[textarea:focus-visible]:outline-(length:--focus-width) has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-focus has-[textarea:focus-visible]:outline-solid',
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
        onPointerDown={focusTextarea}
        {...props}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  );
}

export type PromptInputTextareaProps = {
  disableAutosize?: boolean;
} & Omit<ComponentProps<'textarea'>, 'value' | 'onChange' | 'ref'>;

function fitHeight(element: HTMLTextAreaElement, maxHeight: number | string) {
  element.style.height = 'auto';
  element.style.height =
    typeof maxHeight === 'number'
      ? `${Math.min(element.scrollHeight, maxHeight)}px`
      : `min(${element.scrollHeight}px, ${maxHeight})`;
}

/**
 * True for the keys that send: Enter without Shift, or Ctrl/Cmd+Enter; with `mod-enter`, only
 * Ctrl/Cmd+Enter.
 */
export function isSubmitKey(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'nativeEvent'>,
  submitOn: SubmitOn = 'enter',
) {
  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return false;
  if (submitOn === 'mod-enter') return event.ctrlKey || event.metaKey;
  return !event.shiftKey;
}

/** The textarea: one line to start, grows up to the card's `maxHeight`, then scrolls. */
export function PromptInputTextarea({
  className,
  onKeyDown,
  disableAutosize = false,
  ...props
}: PromptInputTextareaProps) {
  const { value, setValue, maxHeight, onSubmit, disabled, textareaRef, submitOn } =
    usePromptInput();

  useLayoutEffect(() => {
    const element = textareaRef.current;
    if (element && !disableAutosize) fitHeight(element, maxHeight);
  }, [value, maxHeight, disableAutosize, textareaRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (isSubmitKey(event, submitOn)) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      data-slot="prompt-input-textarea"
      value={value}
      onChange={event => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      rows={1}
      disabled={disabled}
      className={cn(
        'block min-h-11 w-full resize-none border-0 bg-transparent px-3 py-2.5 text-body text-fg outline-none placeholder:text-muted focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  );
}

/** The row under the textarea: mode, models, hints and the send button. */
export function PromptInputActions({ children, className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="prompt-input-actions"
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}
