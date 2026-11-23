import { ArrowRight } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

import { DEMO_DISCLOSURE } from '../content/demo';
import { SIGN_IN_HREF } from '../content/landing';
import { type DemoVote, voteLabel } from '../lib/demo-machine';

interface DemoResultProps {
  vote: DemoVote;
  result: string;
  notice: string;
  onNext: () => void;
}

/** After the vote: your verdict, what it says, what a careful reader would notice, and what next. */
export function DemoResult({ vote, result, notice, onNext }: DemoResultProps) {
  return (
    <div
      data-testid="demo-result"
      className={cn(
        'grid gap-6 rounded-xl border border-line bg-bg-deep p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end',
        'border-l-2 border-l-human',
      )}
    >
      <div className="max-w-reading">
        <p className="text-h3 font-semibold text-fg">{voteLabel(vote)}.</p>
        <p className="mt-3 text-body text-fg">{result}</p>
        <p className="mt-2 text-ui text-fg-soft">{notice}</p>
        <p className="mt-4 font-mono text-caption text-muted">{DEMO_DISCLOSURE}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onNext} data-demo-next="">
          Next prompt
          <ArrowRight aria-hidden="true" strokeWidth={2} />
        </Button>
        <a href={SIGN_IN_HREF} className={buttonVariants({ variant: 'primary' })}>
          Sign in to battle real models
        </a>
      </div>
    </div>
  );
}
