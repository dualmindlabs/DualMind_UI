import { cn } from '@/lib/utils/cn';

/**
 * The DualMind emblem: Mind A and Mind B as two rings of equal size, the human's terra point
 * where they meet. The favicon, app icon and social cards use the same drawing
 * (web/public/favicon.svg, icon.svg).
 */
export function Emblem({ className, title = null }: { className?: string; title?: string | null }) {
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
        <circle cx="12.5" cy="16" r="7.5" className="stroke-mind-a" />
        <circle cx="19.5" cy="16" r="7.5" className="stroke-mind-b" />
      </g>
      <circle cx="16" cy="16" r="2" className="fill-human" />
    </svg>
  );
}
