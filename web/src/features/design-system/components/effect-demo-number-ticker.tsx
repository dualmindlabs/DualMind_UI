import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { NumberTicker } from '@/components/vendor/magicui/number-ticker';

import { EffectFrame } from './effect-frame';

/** Number Ticker: a live vote count that springs to each new value. */
export function EffectDemoNumberTicker() {
  const [votes, setVotes] = useState(12408);

  return (
    <EffectFrame effect="number-ticker">
      <div className="grid justify-items-center gap-4 text-center">
        <p className="grid gap-2">
          <span className="eyebrow text-muted">Votes today</span>
          <NumberTicker value={votes} startValue={12000} className="text-h2 font-medium text-fg" />
        </p>
        <Button size="sm" variant="ghost" onClick={() => setVotes(value => value + 37)}>
          <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
          Add 37 votes
        </Button>
      </div>
    </EffectFrame>
  );
}
