import { cn } from '@/lib/utils/cn';

interface TypeSpecimenProps {
  name: string;
  spec: string;
  use: string;
  sample: string;
  className: string;
}

/** One step of the type scale: its name and values on the left, a live sample on the right. */
export function TypeSpecimen({ name, spec, use, sample, className }: TypeSpecimenProps) {
  return (
    <div className="grid gap-3 py-7 md:grid-cols-[15rem_minmax(0,1fr)] md:items-baseline md:gap-10">
      <div>
        <p className="eyebrow text-mind-a">{name}</p>
        <p className="mt-2 font-code text-caption text-fg-soft">{spec}</p>
        <p className="mt-1 text-caption text-muted">{use}</p>
      </div>
      <p className={cn('min-w-0 break-words text-fg', className)}>{sample}</p>
    </div>
  );
}
