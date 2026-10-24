import { cn } from '@/lib/utils/cn';

const emblemMotion =
  'transition-transform duration-(--dur-base) ease-out-expo motion-reduce:transition-none';

/**
 * The DualMind emblem: Mind A and Mind B as two rings of equal size, the human's terra point
 * where they meet. The favicon, app icon and social cards use the same drawing
 * (web/public/favicon.svg, icon.svg).
 */
export function Emblem({
  className,
  title = null,
  interactive = false,
}: {
  className?: string;
  title?: string | null;
  /** The rings drift apart and the point glows when an ancestor named `group/home` is hovered or focused. */
  interactive?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-6 shrink-0', className)}
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
      focusable="false"
    >
      <path
        d="M16 9.37A7.5 7.5 0 0 1 16 22.63A7.5 7.5 0 0 1 16 9.37Z"
        className="fill-human-tint"
      />
      <g fill="none" strokeWidth="2">
        <circle
          cx="12.5"
          cy="16"
          r="7.5"
          className={cn(
            'stroke-mind-a',
            interactive &&
              emblemMotion +
                ' group-hover/home:-translate-x-0.5 group-focus-visible/home:-translate-x-0.5',
          )}
        />
        <circle
          cx="19.5"
          cy="16"
          r="7.5"
          className={cn(
            'stroke-mind-b',
            interactive &&
              emblemMotion +
                ' group-hover/home:translate-x-0.5 group-focus-visible/home:translate-x-0.5',
          )}
        />
      </g>
      <circle
        cx="16"
        cy="16"
        r="2"
        className={cn(
          'fill-human',
          interactive &&
            emblemMotion + ' origin-center [transform-box:fill-box] group-hover/home:scale-125',
        )}
      />
    </svg>
  );
}
