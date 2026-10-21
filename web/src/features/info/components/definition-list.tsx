import type { DefinitionListBlock } from '../content';
import { RichText } from './rich-text';

/** Terms and their meanings: modes, vote choices, storage keys. */
export function DefinitionList({ block }: { block: DefinitionListBlock }) {
  return (
    <dl className="not-prose grid divide-y divide-line border-y border-line">
      {block.items.map(item => (
        <div
          key={item.term}
          className="grid gap-1.5 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8"
        >
          <dt className="text-ui font-semibold wrap-break-word text-fg">{item.term}</dt>
          <dd className="text-body [text-wrap:pretty] text-fg-soft">
            <RichText text={item.description} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
