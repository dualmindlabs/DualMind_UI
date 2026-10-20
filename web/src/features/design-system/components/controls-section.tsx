import { ArrowRight, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { Section } from './section';

export function ControlsSection() {
  return (
    <Section
      id="controls"
      title={
        <>
          Controls that <span className="human-voice text-human">answer back.</span>
        </>
      }
      lead={
        <p>
          Buttons, fields and the focus ring. Every control has a real label, a visible focus state,
          a target of at least 24 by 24 pixels (44 on touch layouts) and borders that reach 3:1.
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5 shadow-raise sm:p-6">
          <h3 className="text-h3 font-semibold">Buttons</h3>
          <p className="mt-1 text-ui-sm text-fg-soft">
            Primary for the main action, terra for the human&apos;s own action, ghost for the rest.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button>
              Start a battle
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
            </Button>
            <Button variant="terra">
              <Check aria-hidden="true" className="size-4" strokeWidth={2} />
              Cast your vote
            </Button>
            <Button variant="ghost">View leaderboard</Button>
            <Button disabled>Unavailable</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small primary</Button>
            <Button size="sm" variant="terra">
              Small terra
            </Button>
            <Button size="sm" variant="ghost">
              Small ghost
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 shadow-raise sm:p-6">
          <h3 className="text-h3 font-semibold">Focus</h3>
          <p className="mt-1 text-ui-sm text-fg-soft">
            Press Tab anywhere on this page: every control shows this ring, 2px in the focus colour
            with a 3px gap (3px wide when more contrast is requested).
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-5 rounded-md border border-dashed border-line p-5">
            <span className="inline-flex h-11 items-center rounded-md border border-line-strong px-5 text-ui font-medium text-fg focus-ring-demo">
              Focused button
            </span>
            <span className="inline-flex h-11 min-w-0 flex-1 items-center rounded-sm border border-line-strong bg-surface-2 px-3.5 text-ui text-muted focus-ring-demo">
              Focused field
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 shadow-raise sm:p-6 lg:col-span-2">
          <h3 className="text-h3 font-semibold">Fields</h3>
          <p className="mt-1 text-ui-sm text-fg-soft">
            Labels above, hints below, errors linked to the field so screen readers announce them.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Field label="Display name" hint="Shown on the battles you share.">
              {control => (
                <Input {...control} name="display-name" autoComplete="nickname" placeholder="Ada" />
              )}
            </Field>
            <Field label="Email" error="Enter a full email address, like ada@example.com.">
              {control => (
                <Input
                  {...control}
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue="ada@"
                />
              )}
            </Field>
            <Field
              label="Prompt"
              hint="Both models get exactly this text. Ctrl + Enter sends it."
              className="md:col-span-2"
            >
              {control => (
                <Textarea
                  {...control}
                  name="prompt"
                  rows={3}
                  placeholder="Ask both models anything"
                />
              )}
            </Field>
          </div>
        </div>
      </div>
    </Section>
  );
}
