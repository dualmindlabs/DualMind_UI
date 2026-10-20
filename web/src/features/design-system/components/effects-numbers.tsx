import { CountUp } from '@/components/vendor/reactbits/count-up';

import { EffectDemoNumberTicker } from './effect-demo-number-ticker';
import { EffectDemoSlidingNumber } from './effect-demo-sliding-number';
import { EffectFrame } from './effect-frame';

/** Count Up (one-shot count-in), Number Ticker (live values) and Sliding Number (digits roll). */
export function EffectsNumbers() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <EffectFrame effect="count-up" replay>
        {run => (
          <dl className="grid grid-cols-2 gap-6 text-center">
            <div>
              <dt className="eyebrow text-muted">Battles</dt>
              <dd className="mt-2 text-h2 font-medium text-fg">
                <CountUp
                  to={48210}
                  separator=","
                  duration={1.8}
                  trigger={run === 0 ? 'view' : 'load'}
                />
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-muted">Top Elo</dt>
              <dd className="mt-2 text-h2 font-medium text-mind-a">
                <CountUp
                  to={1342}
                  from={1000}
                  duration={1.8}
                  trigger={run === 0 ? 'view' : 'load'}
                />
              </dd>
            </div>
          </dl>
        )}
      </EffectFrame>
      <EffectDemoNumberTicker />
      <EffectDemoSlidingNumber />
    </div>
  );
}
