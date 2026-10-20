import { ArrowUpRight } from 'lucide-react';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import { KitCard } from './kit-card';

const models = [
  ['Atlas 2', '1,284'],
  ['Borealis', '1,247'],
  ['Cirrus Pro', '1,201'],
  ['Delta Mini', '1,188'],
  ['Ember 4', '1,163'],
  ['Fable', '1,149'],
  ['Gale', '1,120'],
  ['Halo Lite', '1,097'],
  ['Iris', '1,082'],
  ['Juniper', '1,064'],
] as const;

const faq = [
  {
    question: 'Why are model names hidden until I vote?',
    answer:
      'So the vote is about the answers, not the brands. The names decrypt the moment your vote is saved.',
  },
  {
    question: 'Does one vote change the leaderboard?',
    answer:
      'Yes, a little. Each vote updates both models’ Elo ratings; new models stay provisional until they have enough battles.',
  },
  {
    question: 'Can I take a vote back?',
    answer: 'Not after the reveal, because you have seen the names by then.',
  },
];

/** Cards, loading skeletons, an accordion and a scroll area. */
export function KitDisplay() {
  return (
    <KitCard
      title="Surfaces and disclosure"
      source="@/components/ui/card, skeleton, accordion, scroll-area"
      description="Depth comes from one luminance step and a hairline, not from blur. Skeletons stand in while data loads and stop pulsing under reduced motion."
      className="lg:col-span-2"
    >
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Atlas 2</CardTitle>
            <CardDescription>Rank 1 of 42, after 12,408 battles</CardDescription>
            <CardAction>
              <Badge variant="ok">Stable</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <p className="text-h2 font-medium text-fg tabular-nums">1,284</p>
            <p className="text-caption text-muted">Elo, ±9 at 95% confidence</p>
          </CardContent>
          <CardFooter>
            <a href="/models/" className={buttonVariants({ variant: 'link', size: 'sm' })}>
              Model details
              <ArrowUpRight aria-hidden="true" />
            </a>
          </CardFooter>
        </Card>

        <Card aria-busy="true">
          <span className="sr-only">Loading a model card</span>
          <CardHeader>
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="grid gap-2">
            <Skeleton className="h-9 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-5 w-28" />
          </CardFooter>
        </Card>

        <div className="rounded-lg border border-line bg-bg">
          <p className="eyebrow border-b border-line px-4 py-3 text-muted">Top ten</p>
          <ScrollArea className="h-48">
            <ol className="grid gap-px p-2">
              {models.map(([name, elo], index) => (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-ui-sm hover:bg-hover"
                >
                  <span className="w-5 font-mono text-caption text-muted tabular-nums">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-fg">{name}</span>
                  <span className="text-fg-soft tabular-nums">{elo}</span>
                </li>
              ))}
            </ol>
          </ScrollArea>
        </div>
      </div>

      <Accordion defaultValue={['why-hidden']} className="max-w-reading">
        {faq.map((item, index) => (
          <AccordionItem key={item.question} value={index === 0 ? 'why-hidden' : item.question}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <p>{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </KitCard>
  );
}
