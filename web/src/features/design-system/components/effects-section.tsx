import { useState } from 'react';

import { ReducedMotionScope } from '@/components/motion/reduced-motion-scope';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

import { effects } from '../lib/effects';
import { EffectsBackgrounds } from './effects-backgrounds';
import { EffectsBorders } from './effects-borders';
import { EffectsFlow } from './effects-flow';
import { EffectsNumbers } from './effects-numbers';
import { EffectsSurfaces } from './effects-surfaces';
import { EffectsText } from './effects-text';
import { Section } from './section';

const groups = [
  {
    id: 'backgrounds',
    title: 'Backgrounds',
    lead: 'WebGL, one per page at most, behind the gate: static poster first, the shader only on capable devices, paused off-screen.',
    content: <EffectsBackgrounds />,
  },
  {
    id: 'text',
    title: 'Text',
    lead: 'Screen readers always get the real text once; the animated letters are hidden from them.',
    content: <EffectsText />,
  },
  {
    id: 'numbers',
    title: 'Numbers',
    lead: 'Tabular figures that count in once, spring to live values, or roll digit by digit.',
    content: <EffectsNumbers />,
  },
  {
    id: 'borders',
    title: 'Borders and calls to action',
    lead: 'Light that runs along an edge says something is happening. The border underneath carries the meaning.',
    content: <EffectsBorders />,
  },
  {
    id: 'surfaces',
    title: 'Surfaces and controls',
    lead: 'Lights that follow the pointer and keyboard focus, a bento layout, a sliding highlight.',
    content: <EffectsSurfaces />,
  },
  {
    id: 'flow',
    title: 'Flow, loops and input',
    lead: 'Beams, entrances, loops with a pause button, a scroll-linked timeline and the hero composer.',
    content: <EffectsFlow />,
  },
] as const;

/**
 * Section 07 of /design/: every vendored effect in a labelled frame with its source and licence.
 * A local switch previews the reduced-motion versions; WebGL effects load lazily behind WebGLGate.
 */
export function EffectsSection() {
  const system = useReducedMotion();
  const [preview, setPreview] = useState(false);
  const reduced = system || preview;

  return (
    <Section
      id="effects"
      title={
        <>
          Effects that know <span className="human-voice text-human">when to stop.</span>
        </>
      }
      lead={
        <>
          <p>
            {effects.length} effects from React Bits, Magic UI, Motion Primitives and Aceternity UI,
            ported to our tokens. Each one has a still version for reduced motion, pauses when it is
            off-screen, and keeps its source license next to the code.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
            <button
              type="button"
              aria-pressed={preview}
              onClick={() => setPreview(value => !value)}
              className="group inline-flex h-11 items-center gap-3 rounded-full border border-line-strong bg-surface-2 pr-4 pl-1.5 text-ui-sm font-medium text-fg transition-colors duration-(--dur-fast) hover:border-fg-soft"
            >
              <span
                aria-hidden="true"
                className="relative flex h-7 w-12 items-center rounded-full bg-surface px-1 ring-1 ring-line-strong transition-colors duration-(--dur-fast) ring-inset group-aria-pressed:bg-human"
              >
                <span className="size-5 rounded-full bg-fg-soft transition-transform duration-(--dur-base) ease-out-expo group-aria-pressed:translate-x-5 group-aria-pressed:bg-on-accent" />
              </span>
              Preview reduced motion
            </button>
            <p className="text-caption text-muted" role="status">
              {system
                ? 'Your system asks for reduced motion: every effect shows its still version.'
                : reduced
                  ? 'Showing the reduced-motion versions.'
                  : 'Showing the full motion versions.'}
            </p>
          </div>
        </>
      }
    >
      <ReducedMotionScope reduce={preview} className="grid gap-16">
        {groups.map(group => (
          <div key={group.id} className="grid gap-6">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] md:gap-16">
              <h3 className="text-h3 font-semibold text-fg">{group.title}</h3>
              <p className="text-ui-sm text-fg-soft">{group.lead}</p>
            </div>
            {group.content}
          </div>
        ))}
      </ReducedMotionScope>
    </Section>
  );
}
