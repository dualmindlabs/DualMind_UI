import { useCallback, useState } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import type { FaqItemBlock } from '../content';
import { useFaqHash } from '../hooks/use-faq-hash';
import { faqId } from '../lib/blocks';
import { RichText } from './rich-text';

/**
 * A group of questions as an accordion. Every answer is in the prerendered HTML (hidden until
 * found, so the browser's find-in-page opens it), each question has an id, and opening
 * `/faq/#question-id` opens that question and focuses it.
 */
export function FaqList({ items }: { items: readonly FaqItemBlock[] }) {
  const [open, setOpen] = useState<string[]>([]);
  const ids = items.map(item => faqId(item.question));
  const openOne = useCallback(
    (id: string) => setOpen(current => (current.includes(id) ? current : [...current, id])),
    [],
  );
  useFaqHash(ids, openOne);

  return (
    <Accordion
      multiple
      keepMounted
      hiddenUntilFound
      value={open}
      onValueChange={(value: unknown[]) => setOpen(value.map(String))}
      className="gap-3"
    >
      {items.map(item => {
        const id = faqId(item.question);
        return (
          <div
            key={id}
            id={id}
            className="surface-duel scroll-mt-24 has-[[data-panel-open]]:shadow-(--float)"
          >
            <AccordionItem value={id} className="border-b-0 px-5">
              <AccordionTrigger className="min-h-14 py-4 text-body font-medium">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="grid gap-3 text-body leading-relaxed [text-wrap:pretty]">
                {item.answer.map(paragraph => (
                  <p key={paragraph}>
                    <RichText text={paragraph} />
                  </p>
                ))}
              </AccordionContent>
            </AccordionItem>
          </div>
        );
      })}
    </Accordion>
  );
}
