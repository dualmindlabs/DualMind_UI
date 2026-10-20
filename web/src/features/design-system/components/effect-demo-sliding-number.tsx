import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { SlidingNumber } from '@/components/vendor/motion-primitives/sliding-number';

import { EffectFrame } from './effect-frame';

/** Sliding Number: an Elo rating whose digits roll after a win or a loss. */
export function EffectDemoSlidingNumber() {
  const [elo, setElo] = useState(1284);

  return (
    <EffectFrame effect="sliding-number">
      <div className="grid justify-items-center gap-4 text-center">
        <p className="grid justify-items-center gap-2">
          <span className="eyebrow text-muted">Elo</span>
          <SlidingNumber value={elo} className="text-h2 font-medium text-fg" />
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setElo(value => value + 16)}>
            Win (+16)
          </Button>
          <Button size="sm" variant="outline" onClick={() => setElo(value => value - 12)}>
            Loss (-12)
          </Button>
        </div>
      </div>
    </EffectFrame>
  );
}
