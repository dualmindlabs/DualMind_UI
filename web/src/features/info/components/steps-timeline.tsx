import { Timeline } from '@/components/vendor/aceternity/timeline';

import type { StepsBlock } from '../content';
import { RichText } from './rich-text';

/**
 * The steps of a battle as Aceternity's Timeline: a line that fills as you scroll (a full line,
 * without scroll linking, under reduced motion).
 */
export function StepsTimeline({ block }: { block: StepsBlock }) {
  return (
    <Timeline
      className="max-w-none"
      data={block.items.map((item, index) => ({
        title: item.title,
        content: (
          <div className="max-w-reading pb-8">
            <p className="mb-3 eyebrow text-human tabular-nums">Step {index + 1}</p>
            <p className="text-h3 font-normal [text-wrap:pretty] text-fg-soft">
              <RichText text={item.body} />
            </p>
          </div>
        ),
      }))}
    />
  );
}
