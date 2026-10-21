/**
 * Scroll Button, from prompt-kit by ibelick (Julien Thibeaut).
 * Source: https://www.prompt-kit.com/c/scroll-button.json (copied 2026-10-21)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - Our Button (outline on the raised surface), a Lucide arrow, an accessible name, and a fade
 *   and lift on the motion tokens (instant under reduced motion).
 * - While the view is already at the bottom the button is hidden from everyone: no pointer
 *   events, out of the tab order and `aria-hidden`, so it never traps an invisible focus.
 */
import { ArrowDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useStickToBottomContext } from 'use-stick-to-bottom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export type ScrollButtonProps = Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  label?: string;
};

/** Jumps back to the newest content of the surrounding ChatContainerRoot. */
export function ScrollButton({
  className,
  label = 'Scroll to the latest',
  ...props
}: ScrollButtonProps) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  return (
    <Button
      variant="secondary"
      size="icon-sm"
      aria-label={label}
      aria-hidden={isAtBottom || undefined}
      tabIndex={isAtBottom ? -1 : undefined}
      className={cn(
        'rounded-full shadow-raise-strong transition-[opacity,translate,scale] duration-(--dur-base) ease-out-expo',
        isAtBottom ? 'pointer-events-none translate-y-3 scale-95 opacity-0' : 'opacity-100',
        className,
      )}
      onClick={() => void scrollToBottom()}
      {...props}
    >
      <ArrowDown aria-hidden="true" strokeWidth={1.75} />
    </Button>
  );
}
