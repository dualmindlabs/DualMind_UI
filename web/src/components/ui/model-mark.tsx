/**
 * Model mark: a monogram tile for a model or provider, or the A / B / You role. Decorative
 * (aria-hidden): the model's name is always written next to it. Without a role, the tile takes one
 * of five token tones from a stable hash of the name, so the same model has the same mark on every
 * page. Our own component.
 */
import { cn } from '@/lib/utils/cn';

export type ModelMarkRole = 'a' | 'b' | 'human';

export interface ModelMarkProps {
  /** The model or provider name: the monogram is its first letters. */
  name: string;
  /** Pins the tone to a battle role (a, b or human) instead of the name's hash. */
  who?: ModelMarkRole;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const roleTone: Record<ModelMarkRole, string> = {
  a: 'border-mind-a-edge bg-mind-a-tint text-mind-a',
  b: 'border-mind-b-edge bg-mind-b-tint text-mind-b-text',
  human: 'border-human/50 bg-human-tint text-human',
};

const hashTones = [
  roleTone.a,
  roleTone.b,
  roleTone.human,
  'border-ok/40 bg-surface-2 text-ok',
  'border-line bg-surface-2 text-fg-soft',
] as const;

const sizeClass = {
  sm: 'size-6 rounded-sm text-label',
  md: 'size-9 rounded-md text-ui-sm',
  lg: 'size-14 rounded-lg text-h3',
} as const;

export function monogram(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s.-]/gu, ' ')
    .split(/[\s.-]+/)
    .filter(Boolean);
  const first = words[0] ?? '?';
  const second = words[1];
  return (second ? `${first[0]}${second[0]}` : first.slice(0, 2)).toUpperCase();
}

function toneFor(name: string): string {
  let hash = 0;
  for (const char of name.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hashTones[hash % hashTones.length] ?? hashTones[0];
}

export function ModelMark({ name, who, size = 'md', className }: ModelMarkProps) {
  return (
    <span
      aria-hidden="true"
      data-slot="model-mark"
      className={cn(
        'inline-grid shrink-0 place-items-center border font-mono font-medium shadow-raise select-none',
        sizeClass[size],
        who ? roleTone[who] : toneFor(name),
        className,
      )}
    >
      {monogram(name)}
    </span>
  );
}
