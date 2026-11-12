import { cn } from '@/lib/utils/cn';

import { describeMovement, type Movement } from '../lib/movement';

export interface RankMovementProps {
  /** Undefined on a first visit: nothing is drawn, and nothing is made up. */
  movement: Movement | undefined;
  className?: string;
}

/**
 * How a rank moved since the visitor's last visit: an arrow and the number of places, "new" for
 * a model that was not on the board, a dash when nothing changed. The arrow shape and the words
 * carry the direction, the colour only backs them up.
 */
export function RankMovement({ movement, className }: RankMovementProps) {
  if (movement === undefined) return null;
  const words = describeMovement(movement);

  return (
    <span
      title={words}
      data-movement={movement.kind}
      className={cn(
        'inline-flex h-5 items-center gap-0.5 rounded-[5px] px-1.5 font-mono text-label leading-none font-medium tabular-nums',
        movement.kind === 'up' && 'bg-ok/12 text-ok',
        movement.kind === 'down' && 'bg-bad/12 text-bad',
        movement.kind === 'same' && 'text-muted',
        movement.kind === 'new' && 'bg-mind-a-tint text-mind-a',
        className,
      )}
    >
      <span className="sr-only">{words}</span>
      <span aria-hidden="true" className="inline-flex items-center gap-0.5">
        {movement.kind === 'up' ? (
          <>
            <span className="text-[0.625rem]">▲</span>
            {movement.places}
          </>
        ) : movement.kind === 'down' ? (
          <>
            <span className="text-[0.625rem]">▼</span>
            {movement.places}
          </>
        ) : movement.kind === 'new' ? (
          'NEW'
        ) : (
          '–'
        )}
      </span>
    </span>
  );
}
