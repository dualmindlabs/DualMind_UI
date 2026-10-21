import { ArrowRight } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';

import { DEMO_DISCLOSURE } from '../content/demo';
import { SIGN_IN_HREF } from '../content/landing';

interface DemoResultProps {
  result: string;
  notice: string;
  onNext: () => void;
}

/** After the vote: what your choice says, what a careful reader would notice, and what next. */
export function DemoResult({ result, notice, onNext }: DemoResultProps) {
  return (
    <div
      data-testid="demo-result"
      className="grid gap-5 rounded-lg border border-line bg-bg p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
    >
      <div className="max-w-reading">
        <p className="text-body text-fg">{result}</p>
        <p className="mt-2 text-ui text-fg-soft">{notice}</p>
        <p className="mt-3 font-mono text-caption text-muted">{DEMO_DISCLOSURE}</p>
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
