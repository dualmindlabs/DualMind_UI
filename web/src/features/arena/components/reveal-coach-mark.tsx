import { EyeOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { dismissRevealCoach, isRevealCoachDismissed } from '../lib/coach-mark';

/**
 * A one-time note under the empty Battle heading: the names are hidden until you vote. "Got it"
 * keeps it away for good through localStorage; with storage blocked it shows on every visit and
 * still closes for the current one. It is hidden below the `sm` breakpoint: the phone layout of
 * the empty arena is tuned to keep the prompt box above the fold (mobile.spec.ts), and the note
 * would push it out. Phones get the same explanation from the reveal itself.
 */
export function RevealCoachMark() {
  const [open, setOpen] = useState(() => !isRevealCoachDismissed());
  if (!open) return null;

  return (
    <div
      role="note"
      aria-label="How a battle works"
      className="flex max-w-xl max-sm:hidden items-start gap-3 rounded-lg border border-line bg-glass px-4 py-3 text-left text-ui-sm text-fg-soft shadow-raise"
      data-testid="reveal-coach-mark"
    >
      <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-human" strokeWidth={2} />
      <p className="min-w-0 flex-1">
        Both answers are anonymous. Pick the better one, or call it a tie, and the model names
        appear once your vote is in.
      </p>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          dismissRevealCoach();
          setOpen(false);
        }}
      >
        Got it
      </Button>
    </div>
  );
}
