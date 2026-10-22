import { MessageSquareText } from 'lucide-react';

import { usePromptDraft } from '../hooks/use-prompt-draft';

/**
 * On /login/ and /signup/ after a visitor typed a prompt on the landing page (UI audit P1-1):
 * why they are here, the prompt itself, and the promise that it waits in the arena unsent.
 * Nothing renders without a draft (or before hydration).
 */
export function PromptDraftNotice({ title }: { title: string }) {
  const draft = usePromptDraft();
  if (draft === null) return null;
  return (
    <section
      aria-labelledby="prompt-draft-title"
      data-testid="prompt-draft-notice"
      className="grid gap-2 rounded-lg border border-human/40 bg-human-tint px-4 py-3.5"
    >
      <h2
        id="prompt-draft-title"
        className="flex items-center gap-2 text-ui-sm font-medium text-fg"
      >
        <MessageSquareText aria-hidden="true" className="size-4 text-human" strokeWidth={1.75} />
        {title}
      </h2>
      <p className="line-clamp-3 text-ui-sm break-words text-fg-soft">
        <span className="sr-only">Your prompt: </span>“{draft}”
      </p>
      <p className="text-caption text-muted">
        It will be waiting in the arena’s prompt box. Nothing is sent until you send it.
      </p>
    </section>
  );
}
