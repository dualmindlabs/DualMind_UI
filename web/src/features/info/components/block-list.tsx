import type { ComponentType } from 'react';

import type { Block, StepsBlock } from '../content';
import { groupBlocks } from '../lib/blocks';
import { Callout } from './callout';
import { DefinitionList } from './definition-list';
import { FaqList } from './faq-list';
import { RichText } from './rich-text';
import { StepsList } from './steps-list';

export interface BlockOverrides {
  /** Another way to show steps (How it works uses a timeline). */
  steps?: ComponentType<{ block: StepsBlock }>;
}

/**
 * Renders content blocks, one renderer per block type: paragraph, list, callout, steps, FAQ
 * (consecutive questions become one accordion) and definition list. Text blocks sit in a
 * `prose` wrapper (68ch, token colours); the rest take the room they need.
 */
export function BlockList({
  blocks,
  overrides,
}: {
  blocks: readonly Block[];
  overrides?: BlockOverrides | undefined;
}) {
  const Steps = overrides?.steps ?? StepsList;
  return (
    <div className="grid gap-6">
      {groupBlocks(blocks).map((group, index) => {
        if (group.kind === 'faq') return <FaqList key={`faq-${index}`} items={group.items} />;
        const { block } = group;
        switch (block.type) {
          case 'paragraph':
            return (
              <p key={`p-${index}`} className="prose [text-wrap:pretty]">
                <RichText text={block.text} />
              </p>
            );
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul';
            return (
              <List key={`l-${index}`} className="prose">
                {block.items.map(item => (
                  <li key={item}>
                    <RichText text={item} />
                  </li>
                ))}
              </List>
            );
          }
          case 'callout':
            return <Callout key={`c-${index}`} block={block} className="max-w-reading" />;
          case 'steps':
            return <Steps key={`s-${index}`} block={block} />;
          case 'definitions':
            return <DefinitionList key={`d-${index}`} block={block} />;
        }
      })}
    </div>
  );
}
