import type { StepsBlock } from '../content';
import { RichText } from './rich-text';

/** Steps as a numbered list of cards (the default; How it works uses a timeline instead). */
export function StepsList({ block }: { block: StepsBlock }) {
  return (
    <ol className="not-prose grid gap-4">
      {block.items.map((item, index) => (
        <li
          key={item.title}
          className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 rounded-lg border border-line bg-surface p-5 shadow-raise"
        >
          <span
            aria-hidden="true"
            className="row-span-2 grid size-9 place-items-center rounded-full border border-human/50 bg-human-tint eyebrow text-human"
          >
            {index + 1}
          </span>
          <h3 className="text-h3 font-medium text-fg">{item.title}</h3>
          <p className="mt-1 text-body [text-wrap:pretty] text-fg-soft">
            <RichText text={item.body} />
          </p>
        </li>
      ))}
    </ol>
  );
}
