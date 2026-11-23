import type { StepsBlock } from '../content';
import { RichText } from './rich-text';

/** Steps as a numbered list of lit cards joined by a rule (the default; How it works uses a timeline). */
export function StepsList({ block }: { block: StepsBlock }) {
  return (
    <ol className="not-prose grid gap-4">
      {block.items.map((item, index) => (
        <li
          key={item.title}
          className="surface-duel grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 p-5 print:break-inside-avoid"
        >
          <span
            aria-hidden="true"
            className="row-span-2 grid size-10 place-items-center rounded-md border border-human/50 bg-human-tint numeric text-ui font-medium text-human"
          >
            {index + 1}
          </span>
          <h3 className="display text-h3 text-fg">{item.title}</h3>
          <p className="mt-1 text-body [text-wrap:pretty] text-fg-soft">
            <RichText text={item.body} />
          </p>
        </li>
      ))}
    </ol>
  );
}
