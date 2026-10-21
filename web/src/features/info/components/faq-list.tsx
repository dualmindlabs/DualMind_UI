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
      className="border-t border-line"
    >
      {items.map(item => {
        const id = faqId(item.question);
        return (
          <div key={id} id={id} className="scroll-mt-24">
            <AccordionItem value={id}>
              <AccordionTrigger className="py-4 text-body">{item.question}</AccordionTrigger>
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
