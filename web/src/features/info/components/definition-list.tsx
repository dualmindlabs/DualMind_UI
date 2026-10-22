import type { DefinitionListBlock } from '../content';
import { RichText } from './rich-text';

/** Terms and their meanings: modes, vote choices, storage keys. Each is a small lit card. */
export function DefinitionList({ block }: { block: DefinitionListBlock }) {
  return (
    <dl className="not-prose grid gap-3 sm:grid-cols-2">
      {block.items.map(item => (
        <div
          key={item.term}
          className="surface-duel flex flex-col gap-2 p-5 print:break-inside-avoid"
        >
          <dt className="font-mono text-ui font-medium wrap-break-word text-fg">{item.term}</dt>
          <dd className="text-ui-sm leading-relaxed [text-wrap:pretty] text-fg-soft">
            <RichText text={item.description} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
