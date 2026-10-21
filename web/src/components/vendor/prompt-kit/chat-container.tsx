/**
 * Chat Container, from prompt-kit by ibelick (Julien Thibeaut).
 * Source: https://www.prompt-kit.com/c/chat-container.json (copied 2026-10-21)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - No `role="log"`: a log is a live region, and screen readers would read every word of two
 *   answers as they appear. The arena announces states in its own polite live region instead
 *   (design-direction.md section 7).
 * - Follows the content instantly under reduced motion (smoothly otherwise). The scrolling element
 *   is the one use-stick-to-bottom renders inside the content (`scrollClassName` styles it); the
 *   root only lays it out.
 * - Removed: the scroll anchor element (use-stick-to-bottom follows the content on its own).
 */
import type { ComponentProps, ReactNode } from 'react';
import { StickToBottom } from 'use-stick-to-bottom';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export type ChatContainerRootProps = {
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof StickToBottom>, 'children' | 'resize' | 'initial'>;

/** A scroll area that sticks to the bottom while content grows, until the reader scrolls up. */
export function ChatContainerRoot({ children, className, ...props }: ChatContainerRootProps) {
  const reduce = useShouldReduceMotion();
  return (
    <StickToBottom
      data-slot="chat-container"
      className={cn('relative flex min-h-0', className)}
      resize={reduce ? 'instant' : 'smooth'}
      initial="instant"
      {...props}
    >
      {children}
    </StickToBottom>
  );
}

export type ChatContainerContentProps = {
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof StickToBottom.Content>, 'children'>;

/** The scrolling content of a ChatContainerRoot. */
export function ChatContainerContent({ children, className, ...props }: ChatContainerContentProps) {
  return (
    <StickToBottom.Content className={cn('flex w-full flex-col', className)} {...props}>
      {children}
    </StickToBottom.Content>
  );
}
