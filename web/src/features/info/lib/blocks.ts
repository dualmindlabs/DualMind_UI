import type { Block, FaqItemBlock } from '../content';
import { slugify } from './format';

/** A run of consecutive FAQ blocks (rendered as one accordion), or any other single block. */
export type BlockGroup =
  | { kind: 'faq'; items: readonly FaqItemBlock[] }
  | { kind: 'block'; block: Exclude<Block, FaqItemBlock> };

/** Groups consecutive `faq` blocks, so a section of questions becomes one accordion. */
export function groupBlocks(blocks: readonly Block[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  for (const block of blocks) {
    if (block.type === 'faq') {
      const last = groups[groups.length - 1];
      if (last?.kind === 'faq') {
        groups[groups.length - 1] = { kind: 'faq', items: [...last.items, block] };
      } else {
        groups.push({ kind: 'faq', items: [block] });
      }
    } else {
      groups.push({ kind: 'block', block });
    }
  }
  return groups;
}

/** The deep-link id of a question (`/faq/#do-i-need-an-account`). */
export function faqId(question: string): string {
  return slugify(question);
}
