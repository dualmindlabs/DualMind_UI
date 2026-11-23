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
          <div className="surface-duel max-w-reading p-6 md:p-8">
            <p className="mb-4 inline-flex h-6 items-center rounded-sm border border-human/50 bg-human-tint px-2 eyebrow text-human tabular-nums">
              Step {index + 1}
            </p>
            <p className="text-lead [text-wrap:pretty] text-fg">
              <RichText text={item.body} />
            </p>
          </div>
        ),
      }))}
    />
  );
}
