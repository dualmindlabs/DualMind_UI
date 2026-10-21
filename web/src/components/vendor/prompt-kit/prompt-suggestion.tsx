/**
 * Prompt Suggestion, from prompt-kit by ibelick (Julien Thibeaut).
 * Source: https://www.prompt-kit.com/c/prompt-suggestion.json (copied 2026-10-21)
 * Licence: MIT (see ./LICENSE.md).
 * Our changes:
 * - A pill on our Button (secondary surface, hairline, 36px; 44px targets on touch screens),
 *   with our type tokens; long prompts are cut with an ellipsis, the full text stays the name.
 * - Removed: the highlight (search match) mode and the variant and size props we do not use.
 */
import type { ComponentProps } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export type PromptSuggestionProps = Omit<ComponentProps<typeof Button>, 'variant' | 'size'>;

/** One suggested prompt. Choosing it fills the composer; the caller decides what that means. */
export function PromptSuggestion({ className, children, ...props }: PromptSuggestionProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className={cn(
        'h-9 max-w-full rounded-full px-3.5 text-ui-sm font-normal text-fg-soft hover:text-fg pointer-coarse:h-11',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
    </Button>
  );
}
